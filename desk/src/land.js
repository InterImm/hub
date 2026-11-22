// The Land Office: plots in the Mars cities of cities.interimm.org.
//
// The register is one small JSON file per lot in this repository, _data/land/<city>/<lot>.json,
// published by Jekyll as api/land.json (seals stripped). The 3D explorer reads that feed and
// sends claims here:
//
//   POST /land/claim         a free lot -> committed straight to the site branch, edit code returned once
//   POST /land/verify        lot + edit code -> the current record (to "sign in" on another device)
//   POST /land/update        lot + edit code -> new building, holder name or motto
//   POST /land/release       lot + edit code -> the lot is free again
//   POST /admin/land/revoke  registrar only: take a lot back (bad names, spam)
//   POST /land/challenge     a fresh passkey challenge (see passkey.js)
//   POST /land/passkey/add   lot + edit code (or a passkey) + a new passkey's public key
//   POST /land/passkey/remove
//   POST /land/passkey/signin a passkey -> every lot it holds (sign in on a new device)
//
// One passkey can hold many lots: /land/passkey/add takes a list of lots, and can add a passkey
// the holder already uses on other lots (linkPasskey), so a holder of several lots needs one key.
//
// Wherever an edit code is asked for, a passkey added to the lot works too (body.passkey).
//
// Claims are instant. Every text passes a word filter first, and a registrar can revoke any lot.
// A lot can be claimed for a company on the hub register (also one still awaiting review): the
// company's own edit code then works for the lot too, and its page shows the address.
//
// The city plan (lots, rings, zones, building kit) is the same file the explorer draws from,
// fetched from cities.interimm.org and checked with the same functions (land-plan.js).

import { readPlan, ringStatus, cleanBuilding, storyDate as storyDay } from "./land-plan.js";
import { makeChallenge, checkRegistration, checkAssertion, MAX_PASSKEYS } from "./passkey.js";
import {
  DeskError, github, readCompany, checkSeal, checkAdmin, committer, text, newCode, normalizeCode,
  sha256hex, safeEqual, b64encode, b64decode, isoDay,
} from "./index.js";

export const CITIES = { "isidis-procyon": "https://cities.interimm.org/cities/isidis-procyon/plots.json" };
export const LAND_LIMITS = { holder: 24, motto: 80, contact: 100 };
export const CLAIMS_PER_DAY = 5; // per network address
const LOT_RE = /^[A-Z][0-9]{1,4}$/;
const PLAN_TTL = 10 * 60 * 1000;

// A short built-in list; extend it without a deploy-time code change through the BLOCKED_WORDS
// variable (comma separated). Links are refused too: the register is not a billboard.
const BLOCKED = ["fuck", "shit", "cunt", "nigger", "faggot", "porn", "casino", "傻逼", "煞笔", "操你", "草泥马", "妈逼", "尼玛", "鸡巴", "色情", "赌博", "博彩", "代开发票"];
const LINKISH = /(https?:|www\.|\.(com|net|org|cn|io|xyz|top)\b|t\.me|qq\s*\d{5,}|微信[:：]?\s*\w{5,})/i;

/* ---------------- plans ---------------- */

const planCache = new Map();
export async function loadPlan(env, city) {
  const url = (env.LAND_PLANS && safeParse(env.LAND_PLANS)?.[city]) || CITIES[city];
  if (!url) throw new DeskError(400, "city", "There is no land register for that city.");
  const hit = planCache.get(city);
  if (hit && Date.now() - hit.at < PLAN_TTL) return hit.plan;
  const res = await fetch(url, { cf: { cacheTtl: 600 } });
  if (!res.ok) throw new Error(`plan ${city}: ${res.status}`);
  const plan = readPlan(await res.json());
  planCache.set(city, { plan, at: Date.now() });
  return plan;
}
export function _clearPlanCache() { planCache.clear(); }

/* ---------------- endpoints ---------------- */

export async function landClaim(body, request, env) {
  const { city, plan, lot } = await lotFrom(body, env);
  const holder = text(body.holder, LAND_LIMITS.holder, true, "holder name");
  const motto = text(body.motto, LAND_LIMITS.motto);
  const contact = text(body.contact, LAND_LIMITS.contact);
  const building = cleanBuilding(plan, lot.zone, body.building || {});
  checkWords(env, holder, motto, building.sign);

  // A company claim: check its key and code before anything is written.
  let company = null;
  if (body.company && (body.company.key || body.company.code)) {
    const key = String(body.company.key || "").trim();
    let doc;
    try { doc = await readCompany(env, key, { allowPending: true }); }
    catch (e) { if (e instanceof DeskError) throw new DeskError(400, "company", "No company with that register key."); throw e; }
    try { await checkSeal(key, body.company.code, doc.front); }
    catch (e) { throw new DeskError(403, "company_code", "That edit code does not match the company."); }
    company = { key, name: plainName(doc.front.name), ...(doc.pending ? { pending: true } : {}) };
  }

  // Frontier rings open as the city fills.
  const held = await heldLots(env, city);
  if (held.has(lot.id)) throw new DeskError(409, "taken", "Someone already holds this lot.");
  const rows = ringStatus(plan, { lots: Object.fromEntries([...held].map(id => [id, true])) });
  if (!rows[lot.ring].open) throw new DeskError(403, "locked", "This ring is not open yet.");

  await rateLimit(request, env);

  const code = newCode();
  const now = new Date();
  const record = {
    city, lot: lot.id, holder, ...(motto ? { motto } : {}), building,
    ...(company ? { company } : {}),
    granted: storyDay(now), granted_earth: isoDay(now),
    seal: await landSeal(city, lot.id, code),
  };
  try {
    // No sha: GitHub refuses the write if the file appeared since we looked, so two people
    // can never both get the same lot.
    await github(env)(`/contents/${landPath(city, lot.id)}`, {
      method: "PUT",
      body: { message: `Land: ${lot.id} granted to ${holder}`, content: b64encode(JSON.stringify(record, null, 1) + "\n"), branch: env.GITHUB_BRANCH, committer: committer(env) },
    });
  } catch (e) {
    if (e.ghStatus === 422 || e.ghStatus === 409) throw new DeskError(409, "taken", "Someone claimed this lot a moment ago.");
    throw e;
  }
  if (contact && env.CONTACTS) await env.CONTACTS.put(`land:${city}:${lot.id}`, JSON.stringify({ contact, at: now.toISOString() }));
  return { ok: true, lot: lot.id, code, record: publicLand(record) };
}

export async function landVerify(body, env) {
  if (Array.isArray(body.lots)) return landVerifyMany(body, env);
  const { city, lot } = await lotFrom(body, env);
  const doc = await readLand(env, city, lot.id);
  await checkLandAuth(env, doc.record, body);
  return { ok: true, lot: lot.id, record: publicLand(doc.record), passkeys: passkeyList(doc.record) };
}

// A key card for several lots: every lot with its own code, one human check. A lot whose code
// does not match is listed under "failed"; the rest are returned.
async function landVerifyMany(body, env) {
  const city = String(body.city || "");
  if (!body.lots.length || body.lots.length > LOTS_PER_CALL) throw new DeskError(400, "lot", `One to ${LOTS_PER_CALL} lots at a time.`);
  const lots = {}, failed = [];
  for (const it of body.lots) {
    const { lot } = await lotFrom({ city, lot: it?.lot }, env);
    try {
      const doc = await readLand(env, city, lot.id);
      await checkLandCode(env, doc.record, it.code);
      lots[lot.id] = { record: publicLand(doc.record), passkeys: passkeyList(doc.record) };
    } catch (e) { if (!(e instanceof DeskError)) throw e; failed.push(lot.id); }
  }
  if (!Object.keys(lots).length) throw new DeskError(403, "code", "That edit code does not match this lot.");
  return { ok: true, lots, failed };
}

export async function landChallenge(body, env) {
  const city = String(body.city || "");
  if (!CITIES[city]) throw new DeskError(400, "city", "There is no land register for that city.");
  return { ok: true, challenge: await makeChallenge(env, city), rpId: env.PASSKEY_RP_ID || "cities.interimm.org" };
}

// Add one passkey to one or many lots. Each lot proves itself with its own code, or with a
// passkey it already holds (body.passkey, checked once). The passkey to add is either new
// (body.newPasskey, from navigator.credentials.create) or one the holder already uses on other
// lots (body.linkPasskey, a sign-in with it), so that one passkey can hold all of a holder's lots.
export const LOTS_PER_CALL = 20;
export async function landPasskeyAdd(body, env) {
  const city = String(body.city || "");
  const items = Array.isArray(body.lots) ? body.lots : [{ lot: body.lot, code: body.code }];
  if (!items.length || items.length > LOTS_PER_CALL) throw new DeskError(400, "lot", `One to ${LOTS_PER_CALL} lots at a time.`);
  const lots = [];
  for (const it of items) {
    const { lot } = await lotFrom({ city, lot: it?.lot }, env);
    if (!lots.some(x => x.id === lot.id)) lots.push({ id: lot.id, code: it?.code });
  }
  const docs = new Map();
  for (const l of lots) docs.set(l.id, await readLand(env, city, l.id));
  // proof for each lot
  let proven = null;
  if (body.passkey) {
    const first = [...docs.values()].find(d => (d.record.passkeys || []).some(k => k.id === body.passkey.id));
    if (!first) throw new DeskError(403, "passkey_unknown", "That passkey is not on this lot.");
    proven = await checkAssertion(env, city, first.record.passkeys, body.passkey);
  }
  for (const l of lots) {
    const r = docs.get(l.id).record;
    if (proven && (r.passkeys || []).some(k => k.id === proven.id && k.spki === proven.spki)) continue;
    await checkLandCode(env, r, l.code);
  }
  // the passkey to add
  let key;
  if (body.linkPasskey) {
    const known = await findPasskey(env, city, body.linkPasskey.id, [...docs.values()]);
    if (!known) throw new DeskError(403, "passkey_unknown", "That passkey is not on any of your lots.");
    const pk = await checkAssertion(env, city, [known], body.linkPasskey);
    key = { id: pk.id, spki: pk.spki, alg: pk.alg, name: pk.name || "", added: isoDay(new Date()) };
  } else key = await checkRegistration(env, city, body.newPasskey);
  const out = {};
  for (const l of lots) {
    for (let attempt = 0; ; attempt++) {
      const doc = attempt === 0 ? docs.get(l.id) : await readLand(env, city, l.id);
      const keys = (doc.record.passkeys || []).filter(k => k.id !== key.id);
      if (keys.length >= MAX_PASSKEYS) throw new DeskError(400, "caps", `At most ${MAX_PASSKEYS} passkeys per lot (${l.id}).`);
      const r = { ...doc.record, passkeys: [...keys, key] };
      try {
        await writeLand(env, city, l.id, r, doc.sha, `Land: ${l.id} passkey added`);
        out[l.id] = passkeyList(r);
        break;
      } catch (e) { if (e.ghStatus === 409 && attempt === 0) continue; throw e; }
    }
  }
  await indexPasskey(env, city, key.id, Object.keys(out), []);
  return { ok: true, lot: lots[0].id, passkeys: out[lots[0].id], lots: out };
}

export async function landPasskeyRemove(body, env) {
  const { city, lot } = await lotFrom(body, env);
  const doc = await readLand(env, city, lot.id);
  await checkLandAuth(env, doc.record, body);
  const id = String(body.id || "");
  const r = { ...doc.record, passkeys: (doc.record.passkeys || []).filter(k => k.id !== id) };
  if (!r.passkeys.length) delete r.passkeys;
  await writeLand(env, city, lot.id, r, doc.sha, `Land: ${lot.id} passkey removed`);
  await indexPasskey(env, city, id, [], [lot.id]);
  return { ok: true, lot: lot.id, passkeys: passkeyList(r) };
}

// Sign in with a passkey and get back every lot it holds, on a new device.
export async function landPasskeySignin(body, env) {
  const city = String(body.city || "");
  if (!CITIES[city] && !(env.LAND_PLANS && safeParse(env.LAND_PLANS)?.[city])) throw new DeskError(400, "city", "There is no land register for that city.");
  const a = body.passkey, id = String(a?.id || "");
  if (!id) throw new DeskError(400, "passkey", "The passkey sign-in could not be checked. Please try again.");
  const names = new Set(await indexed(env, city, id));
  const hint = String(body.lot || "").toUpperCase();
  if (LOT_RE.test(hint)) names.add(hint);
  const found = [];
  for (const n of [...names].slice(0, 200)) {
    try { const doc = await readLand(env, city, n); if ((doc.record.passkeys || []).some(k => k.id === id)) found.push(doc); }
    catch (e) { if (!(e instanceof DeskError)) throw e; }
  }
  if (!found.length) throw new DeskError(403, "passkey_unknown", "That passkey is not on any lot.");
  const pk = await checkAssertion(env, city, found[0].record.passkeys, a);
  const mine = found.filter(d => d.record.passkeys.some(k => k.id === pk.id && k.spki === pk.spki));
  await indexSet(env, city, id, mine.map(d => d.record.lot));
  return { ok: true, lots: Object.fromEntries(mine.map(d => [d.record.lot, { record: publicLand(d.record), passkeys: passkeyList(d.record) }])) };
}

export async function landUpdate(body, env) {
  const { city, plan, lot } = await lotFrom(body, env);
  for (let attempt = 0; ; attempt++) {
    const doc = await readLand(env, city, lot.id);
    await checkLandAuth(env, doc.record, body);
    const r = { ...doc.record };
    if (body.holder !== undefined) r.holder = text(body.holder, LAND_LIMITS.holder, true, "holder name");
    if (body.motto !== undefined) { const m = text(body.motto, LAND_LIMITS.motto); if (m) r.motto = m; else delete r.motto; }
    if (body.building !== undefined) r.building = cleanBuilding(plan, lot.zone, body.building || {});
    checkWords(env, r.holder, r.motto, r.building?.sign);
    r.updated_earth = isoDay(new Date());
    try {
      await github(env)(`/contents/${landPath(city, lot.id)}`, {
        method: "PUT",
        body: { message: `Land: ${lot.id} rebuilt by ${r.holder}`, content: b64encode(JSON.stringify(r, null, 1) + "\n"), sha: doc.sha, branch: env.GITHUB_BRANCH, committer: committer(env) },
      });
      return { ok: true, lot: lot.id, record: publicLand(r), passkeys: passkeyList(r) };
    } catch (e) {
      if (e.ghStatus === 409 && attempt === 0) continue;
      throw e;
    }
  }
}

export async function landRelease(body, env) {
  const { city, lot } = await lotFrom(body, env);
  const doc = await readLand(env, city, lot.id);
  await checkLandAuth(env, doc.record, body);
  await removeLand(env, city, lot.id, doc.sha, `Land: ${lot.id} given up by ${doc.record.holder}`);
  for (const k of doc.record.passkeys || []) await indexPasskey(env, city, k.id, [], [lot.id]);
  return { ok: true, lot: lot.id };
}

export async function adminLandRevoke(body, request, env) {
  checkAdmin(request, env);
  const { city, lot } = await lotFrom(body, env);
  const doc = await readLand(env, city, lot.id);
  const reason = text(body.reason, 120);
  const contact = env.CONTACTS ? await env.CONTACTS.get(`land:${city}:${lot.id}`) : null;
  await removeLand(env, city, lot.id, doc.sha, `Land: ${lot.id} revoked by the registrar${reason ? ` (${reason})` : ""}`);
  for (const k of doc.record.passkeys || []) await indexPasskey(env, city, k.id, [], [lot.id]);
  return { ok: true, lot: lot.id, record: publicLand(doc.record), contact: contact ? safeParse(contact)?.contact || null : null };
}

/* ---------------- rules ---------------- */

export async function landSeal(city, lot, code) { return sha256hex(`land:${city}:${lot}:${normalizeCode(code)}`); }

// A passkey on the lot, or else an edit code.
async function checkLandAuth(env, record, body) {
  if (body.passkey) { await checkAssertion(env, record.city, record.passkeys, body.passkey); return; }
  return checkLandCode(env, record, body.code);
}

// The lot's own code always works. For a company lot, so does the company's code.
async function checkLandCode(env, record, code) {
  if (code && record.seal && safeEqual(await landSeal(record.city, record.lot, code), String(record.seal))) return;
  if (code && record.company?.key) {
    try {
      const doc = await readCompany(env, record.company.key, { allowPending: true });
      await checkSeal(record.company.key, code, doc.front);
      return;
    } catch (e) { if (!(e instanceof DeskError)) throw e; }
  }
  throw new DeskError(403, "code", "That edit code does not match this lot.");
}

export function checkWords(env, ...fields) {
  const extra = String(env.BLOCKED_WORDS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const words = BLOCKED.concat(extra);
  for (const f of fields) {
    if (!f) continue;
    const flat = String(f).toLowerCase().replace(/[\s._\-*·]/g, "");
    if (words.some(w => flat.includes(w)) || LINKISH.test(f)) throw new DeskError(400, "words", "Some words are not allowed on the register.");
  }
}

async function rateLimit(request, env) {
  if (!env.CONTACTS) return;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const k = `rl:land:${isoDay(new Date())}:${ip}`;
  const n = Number(await env.CONTACTS.get(k)) || 0;
  if (n >= CLAIMS_PER_DAY) throw new DeskError(429, "rate", "Too many claims from this network today.");
  await env.CONTACTS.put(k, String(n + 1), { expirationTtl: 2 * 86400 });
}

export function publicLand(r) { const { seal: _s, passkeys: _p, ...rest } = r; return rest; }
function passkeyList(r) { return (r.passkeys || []).map(k => ({ id: k.id, name: k.name || "", added: k.added })); }

async function writeLand(env, city, id, r, sha, message) {
  await github(env)(`/contents/${landPath(city, id)}`, {
    method: "PUT",
    body: { message, content: b64encode(JSON.stringify(r, null, 1) + "\n"), sha, branch: env.GITHUB_BRANCH, committer: committer(env) },
  });
}

/* ---------------- passkey index ---------------- */

// Which lots a passkey is on, kept in KV as pk:<city>:<credential id> -> ["A17", ...] so that a
// passkey sign-in on a new device finds every lot. A hint only: each lot file is still checked.
const pkKey = (city, id) => `pk:${city}:${id}`;
async function indexed(env, city, id) {
  if (!env.CONTACTS) return [];
  const v = safeParse(await env.CONTACTS.get(pkKey(city, id)));
  return Array.isArray(v) ? v.filter(x => LOT_RE.test(String(x))) : [];
}
async function indexSet(env, city, id, lots) {
  if (!env.CONTACTS) return;
  if (lots.length) await env.CONTACTS.put(pkKey(city, id), JSON.stringify([...new Set(lots)].sort()));
  else await env.CONTACTS.delete(pkKey(city, id));
}
async function indexPasskey(env, city, id, add, drop) {
  const cur = new Set(await indexed(env, city, id));
  for (const l of add) cur.add(l);
  for (const l of drop) cur.delete(l);
  await indexSet(env, city, id, [...cur]);
}
// A passkey's stored public key: from the lots in hand, else from a lot the index names.
async function findPasskey(env, city, id, docs) {
  for (const d of docs) { const k = (d.record.passkeys || []).find(x => x.id === id); if (k) return k; }
  for (const n of await indexed(env, city, id)) {
    try { const d = await readLand(env, city, n); const k = (d.record.passkeys || []).find(x => x.id === id); if (k) return k; }
    catch (e) { if (!(e instanceof DeskError)) throw e; }
  }
  return null;
}

/* ---------------- files ---------------- */

export function landPath(city, lot) { return `_data/land/${city}/${lot}.json`; }

async function lotFrom(body, env) {
  const city = String(body.city || "");
  if (!CITIES[city] && !(env.LAND_PLANS && safeParse(env.LAND_PLANS)?.[city])) throw new DeskError(400, "city", "There is no land register for that city.");
  const id = String(body.lot || "").toUpperCase();
  if (!LOT_RE.test(id)) throw new DeskError(400, "lot", "That is not a lot number.");
  const plan = await loadPlan(env, city);
  const lot = plan.byId.get(id);
  if (!lot) throw new DeskError(400, "lot", "That is not a lot number.");
  return { city, plan, lot };
}

async function readLand(env, city, id) {
  let file;
  try { file = await github(env)(`/contents/${landPath(city, id)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`); }
  catch (e) { if (e.ghStatus === 404) throw new DeskError(404, "free", "Nobody holds this lot."); throw e; }
  return { record: JSON.parse(b64decode(file.content)), sha: file.sha };
}

async function removeLand(env, city, id, sha, message) {
  await github(env)(`/contents/${landPath(city, id)}`, { method: "DELETE", body: { message, sha, branch: env.GITHUB_BRANCH, committer: committer(env) } });
  if (env.CONTACTS) await env.CONTACTS.delete(`land:${city}:${id}`);
}

// Which lots are held right now. Two small reads: the land folder (for the city folder's tree
// sha), then that tree, which lists every file however many there are.
async function heldLots(env, city) {
  const gh = github(env);
  let dir;
  try { dir = await gh(`/contents/_data/land?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`); }
  catch (e) { if (e.ghStatus === 404) return new Set(); throw e; }
  const entry = (Array.isArray(dir) ? dir : []).find(d => d.name === city && d.type === "dir");
  if (!entry) return new Set();
  const tree = await gh(`/git/trees/${entry.sha}`);
  return new Set((tree.tree || []).map(t => t.path).filter(p => p.endsWith(".json")).map(p => p.slice(0, -5)));
}

function plainName(n) { return String(Array.isArray(n) ? n[0] : n || "").slice(0, 60); }
function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
