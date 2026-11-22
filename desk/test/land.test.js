// The Land Office (src/land.js). GitHub, Turnstile and the city plan are faked in memory.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import worker, { seal, serialize } from "../src/index.js";
import { _clearPlanCache, landSeal } from "../src/land.js";

const ORIGIN = "https://cities.interimm.org";
const kv = new Map();
const CONTACTS = { get: async k => (kv.has(k) ? kv.get(k) : null), put: async (k, v) => void kv.set(k, v), delete: async k => void kv.delete(k) };
const env = { GITHUB_REPO: "InterImm/hub", GITHUB_BRANCH: "gh-pages", GITHUB_TOKEN: "t", ALLOWED_ORIGINS: "https://interimm.org," + ORIGIN, TURNSTILE_SECRET: "s", ADMIN_KEY: "registrar-key", CONTACTS };

// A tiny plan: ring A (always open, 4 lots) and frontier ring B (opens when A is 50% held).
const PLAN = {
  version: 1, city: "isidis-procyon", core: [0, 0], geo: { lat: 16, lon: 84, metresPerDegree: 59158 },
  zones: { commerce: { types: ["shop", "tower"], maxFloors: 12 }, farms: { types: ["greenhouse", "dome"], maxFloors: 2 } },
  building: { types: { shop: { floors: [1, 3] }, tower: { floors: [3, 12] }, greenhouse: { floors: [1, 2] }, dome: { floors: [1, 2] } }, colors: { regolith: "#b86", rust: "#a43" }, roofs: ["flat", "solar"], signMax: 16 },
  rings: [{ id: "A", zone: "commerce" }, { id: "B", zone: "farms", frontier: true, opens: { after: "A", share: 0.5 } }],
  avenues: [{ name: "Polar Avenue", name_cn: "北极大道" }],
  lotFields: ["id", "ring", "side", "b1", "b2", "r1", "r2", "area", "segment"],
  lots: [["A1", 0, 0, 0, 5, 500, 540, 1400, 0], ["A2", 0, 0, 5, 10, 500, 540, 1400, 0], ["A3", 0, 0, 10, 15, 500, 540, 1400, 0], ["A4", 0, 0, 15, 20, 500, 540, 1400, 0], ["B1", 1, 0, 0, 5, 600, 670, 2000, 0]],
};

let files, turnstileOk, writes;
const b64 = s => Buffer.from(s, "utf8").toString("base64");
const unb64 = s => Buffer.from(s, "base64").toString("utf8");
const reply = (status, data) => new Response(data === undefined ? null : JSON.stringify(data), { status });

beforeEach(() => { files = {}; turnstileOk = true; writes = 0; kv.clear(); _clearPlanCache(); });

globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.startsWith("https://challenges.cloudflare.com/")) return reply(200, { success: turnstileOk });
  if (url === "https://cities.interimm.org/cities/isidis-procyon/plots.json") return reply(200, PLAN);
  const m = url.match(/^https:\/\/api\.github\.com\/repos\/InterImm\/hub(\/[^?]*)(?:\?ref=(.*))?$/);
  if (!m) throw new Error("unexpected fetch " + url);
  const [, path] = m;
  const body = init.body ? JSON.parse(init.body) : null;
  const method = init.method || "GET";
  if (method === "GET" && path === "/contents/_data/land") {
    const cities = [...new Set(Object.keys(files).filter(p => p.startsWith("_data/land/")).map(p => p.split("/")[2]))];
    return cities.length ? reply(200, cities.map(c => ({ name: c, type: "dir", sha: "tree:" + c }))) : reply(404, {});
  }
  if (method === "GET" && path.startsWith("/git/trees/tree:")) {
    const c = path.slice(16);
    return reply(200, { tree: Object.keys(files).filter(p => p.startsWith(`_data/land/${c}/`)).map(p => ({ path: p.split("/").pop(), type: "blob" })) });
  }
  if (path.startsWith("/contents/")) {
    const p = path.slice(10);
    const f = files[p];
    if (method === "GET") return f ? reply(200, { content: b64(f.text), sha: f.sha }) : reply(404, { message: "Not Found" });
    if (method === "PUT") {
      if (f && !body.sha) return reply(422, { message: "sha wasn't supplied" });
      if (f && f.sha !== body.sha) return reply(409, { message: "conflict" });
      files[p] = { text: unb64(body.content), sha: "sha-" + Math.random() }; writes++;
      return reply(200, {});
    }
    if (method === "DELETE") { if (!f || f.sha !== body.sha) return reply(409, {}); delete files[p]; return reply(200, {}); }
  }
  throw new Error(`unexpected ${method} ${path}`);
};

const call = async (path, body, headers = {}) => {
  const res = await worker.fetch(new Request("https://desk.interimm.org" + path, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.9", ...headers }, body: JSON.stringify({ turnstile: "tok", ...body }) }), env);
  return { status: res.status, data: await res.json() };
};
const lotFile = id => JSON.parse(files[`_data/land/isidis-procyon/${id}.json`].text);
const claim = (lot, extra = {}) => call("/land/claim", { city: "isidis-procyon", lot, holder: "红尘咖啡", motto: "第一杯咖啡", building: { type: "tower", floors: 40, color: "rust", sign: "红尘咖啡" }, ...extra });

test("a claim writes the lot, cleans the building and returns a code once", async () => {
  const { status, data } = await claim("A1", { contact: "me@example.org" });
  assert.equal(status, 200);
  assert.match(data.code, /^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
  assert.equal(data.record.seal, undefined);
  const f = lotFile("A1");
  assert.equal(f.holder, "红尘咖啡");
  assert.equal(f.building.floors, 12, "floors clamped to the zone");
  assert.equal(f.seal, await landSeal("isidis-procyon", "A1", data.code));
  assert.match(f.granted, /^22\d\d-/);
  assert.ok(kv.get("land:isidis-procyon:A1").includes("me@example.org"), "private contact kept in KV, not the repo");
  assert.ok(!files["_data/land/isidis-procyon/A1.json"].text.includes("example.org"));
});

test("a held lot cannot be claimed again", async () => {
  await claim("A1");
  const { status, data } = await claim("A1");
  assert.equal(status, 409); assert.equal(data.error, "taken");
});

test("frontier rings stay locked until the ring inside is filled to its share", async () => {
  let r = await claim("B1");
  assert.equal(r.status, 403); assert.equal(r.data.error, "locked");
  await claim("A1"); await claim("A2");
  r = await claim("B1");
  assert.equal(r.status, 200);
  assert.equal(lotFile("B1").building.type, "greenhouse", "type not allowed in farms falls back");
});

test("words and links are refused", async () => {
  for (const holder of ["傻 逼", "visit www.spam.top", "F.U.C.K"]) {
    const { status, data } = await claim("A3", { holder });
    assert.equal(status, 400, holder); assert.equal(data.error, "words");
  }
  const r = await claim("A3", { holder: "ok", building: { type: "shop", sign: "http://x.cn" } });
  assert.equal(r.data.error, "words");
  assert.equal(writes, 0);
});

test("unknown lots, cities and missing names are refused", async () => {
  assert.equal((await claim("Z9")).data.error, "lot");
  assert.equal((await claim("A1", { city: "atlantis" })).data.error, "city");
  assert.equal((await claim("A1", { holder: " " })).data.error, "missing");
});

test("five claims a day per network", async () => {
  for (const id of ["A1", "A2", "A3", "A4", "B1"]) assert.equal((await claim(id)).status, 200, id);
  delete files["_data/land/isidis-procyon/A1.json"];
  const r = await claim("A1");
  assert.equal(r.status, 429); assert.equal(r.data.error, "rate");
});

test("verify, update and release need the lot's code", async () => {
  const { data } = await claim("A2");
  const bad = await call("/land/verify", { city: "isidis-procyon", lot: "A2", code: "0000-0000-0000-0000" });
  assert.equal(bad.status, 403);
  const ok = await call("/land/verify", { city: "isidis-procyon", lot: "a2", code: data.code.toLowerCase() });
  assert.equal(ok.status, 200); assert.equal(ok.data.record.holder, "红尘咖啡");
  const up = await call("/land/update", { city: "isidis-procyon", lot: "A2", code: data.code, holder: "Red Dust", motto: "", building: { type: "shop", floors: 2 } });
  assert.equal(up.status, 200);
  const f = lotFile("A2");
  assert.equal(f.holder, "Red Dust"); assert.equal(f.motto, undefined); assert.equal(f.building.type, "shop");
  assert.equal(f.seal, await landSeal("isidis-procyon", "A2", data.code), "seal unchanged");
  assert.equal((await call("/land/release", { city: "isidis-procyon", lot: "A2", code: "nope" })).status, 403);
  assert.equal((await call("/land/release", { city: "isidis-procyon", lot: "A2", code: data.code })).status, 200);
  assert.equal(files["_data/land/isidis-procyon/A2.json"], undefined);
});

test("a company claim checks the company code, links the lot, and the company code works for it", async () => {
  const key = "company-redlantern01";
  files[`_companies/${key}.md`] = { text: serialize({ _id: "redlantern01", name: "红灯笼茶馆", seal: await seal(key, "AAAA-BBBB-CCCC-DDDD") }, ""), sha: "c1" };
  const wrong = await claim("A1", { company: { key, code: "AAAA-BBBB-CCCC-0000" } });
  assert.equal(wrong.status, 403); assert.equal(wrong.data.error, "company_code");
  const missing = await claim("A1", { company: { key: "company-nobody0", code: "x" } });
  assert.equal(missing.data.error, "company");
  const { status, data } = await claim("A1", { company: { key, code: "aaaa bbbb cccc dddd" } });
  assert.equal(status, 200);
  assert.deepEqual(lotFile("A1").company, { key, name: "红灯笼茶馆" });
  const up = await call("/land/update", { city: "isidis-procyon", lot: "A1", code: "AAAA-BBBB-CCCC-DDDD", motto: "茶" });
  assert.equal(up.status, 200, "company code also works");
  assert.notEqual(data.code, "AAAA-BBBB-CCCC-DDDD");
});

test("the registrar can revoke a lot and read its contact", async () => {
  await claim("A3", { contact: "wechat-someone" });
  const no = await worker.fetch(new Request("https://desk.interimm.org/admin/land/revoke", { method: "POST", body: JSON.stringify({ city: "isidis-procyon", lot: "A3" }) }), env);
  assert.equal(no.status, 401);
  const res = await worker.fetch(new Request("https://desk.interimm.org/admin/land/revoke", { method: "POST", headers: { Authorization: "Bearer registrar-key" }, body: JSON.stringify({ city: "isidis-procyon", lot: "A3", reason: "spam" }) }), env);
  const out = await res.json();
  assert.equal(res.status, 200); assert.equal(out.contact, "wechat-someone");
  assert.equal(files["_data/land/isidis-procyon/A3.json"], undefined);
});

test("cities.interimm.org is an allowed origin; others are not", async () => {
  const res = await worker.fetch(new Request("https://desk.interimm.org/land/claim", { method: "POST", headers: { Origin: "https://evil.example" }, body: "{}" }), env);
  assert.equal(res.status, 403);
});

/* ---------------- passkeys ---------------- */
import { b64url } from "../src/passkey.js";
const enc = s => new TextEncoder().encode(s);
const sha = async b => new Uint8Array(await crypto.subtle.digest("SHA-256", b));
function rawToDer(raw) {
  const int = b => { let i = 0; while (i < b.length - 1 && b[i] === 0) i++; b = b.slice(i); if (b[0] & 0x80) b = Uint8Array.of(0, ...b); return [0x02, b.length, ...b]; };
  const body = [...int(raw.slice(0, 32)), ...int(raw.slice(32))];
  return Uint8Array.from([0x30, body.length, ...body]);
}
// A tiny authenticator: one key pair, signs like a browser would.
async function authenticator(kind = "ES256") {
  const params = kind === "ES256" ? { name: "ECDSA", namedCurve: "P-256" } : { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: Uint8Array.of(1, 0, 1), hash: "SHA-256" };
  const kp = await crypto.subtle.generateKey(params, true, ["sign", "verify"]);
  const id = b64url(crypto.getRandomValues(new Uint8Array(20)));
  const spki = b64url(new Uint8Array(await crypto.subtle.exportKey("spki", kp.publicKey)));
  const challenge = async () => (await call("/land/challenge", { city: "isidis-procyon" })).data.challenge;
  return {
    id,
    async create(origin = ORIGIN) {
      const cd = enc(JSON.stringify({ type: "webauthn.create", challenge: b64url(enc(await challenge())), origin }));
      return { id, spki, alg: kind === "ES256" ? -7 : -257, clientDataJSON: b64url(cd), name: "phone" };
    },
    async get({ origin = ORIGIN, rp = "cities.interimm.org", tamper = false } = {}) {
      const cd = enc(JSON.stringify({ type: "webauthn.get", challenge: b64url(enc(await challenge())), origin }));
      const auth = new Uint8Array(37); auth.set(await sha(enc(rp))); auth[32] = 0x05;
      const signed = new Uint8Array(37 + 32); signed.set(auth); signed.set(await sha(cd), 37);
      if (tamper) signed[40] ^= 1;
      let sig = new Uint8Array(await crypto.subtle.sign(kind === "ES256" ? { name: "ECDSA", hash: "SHA-256" } : { name: "RSASSA-PKCS1-v1_5" }, kp.privateKey, signed));
      if (kind === "ES256") sig = rawToDer(sig);
      return { id, clientDataJSON: b64url(cd), authenticatorData: b64url(auth), signature: b64url(sig) };
    },
  };
}

test("a passkey added with the code then works instead of the code, and is never published", async () => {
  const { data } = await claim("A1");
  const phone = await authenticator("ES256");
  const add = await call("/land/passkey/add", { city: "isidis-procyon", lot: "A1", code: data.code, newPasskey: await phone.create() });
  assert.equal(add.status, 200, JSON.stringify(add.data));
  assert.equal(add.data.passkeys.length, 1);
  assert.equal(lotFile("A1").passkeys[0].alg, -7);
  const v = await call("/land/verify", { city: "isidis-procyon", lot: "A1", passkey: await phone.get() });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.equal(v.data.record.passkeys, undefined, "public record carries no keys");
  assert.equal(v.data.passkeys[0].name, "phone");
  const up = await call("/land/update", { city: "isidis-procyon", lot: "A1", passkey: await phone.get(), motto: "签名登录" });
  assert.equal(up.status, 200); assert.equal(lotFile("A1").motto, "签名登录");
});

test("RS256 passkeys work too", async () => {
  const { data } = await claim("A2");
  const laptop = await authenticator("RS256");
  assert.equal((await call("/land/passkey/add", { city: "isidis-procyon", lot: "A2", code: data.code, newPasskey: await laptop.create() })).status, 200);
  assert.equal((await call("/land/verify", { city: "isidis-procyon", lot: "A2", passkey: await laptop.get() })).status, 200);
});

test("bad passkey sign-ins are refused", async () => {
  const { data } = await claim("A3");
  const phone = await authenticator(), stranger = await authenticator();
  await call("/land/passkey/add", { city: "isidis-procyon", lot: "A3", code: data.code, newPasskey: await phone.create() });
  const v = p => call("/land/verify", { city: "isidis-procyon", lot: "A3", passkey: p });
  assert.equal((await v(await stranger.get())).data.error, "passkey_unknown");
  assert.equal((await v(await phone.get({ tamper: true }))).status, 403, "bad signature");
  assert.equal((await v(await phone.get({ origin: "https://evil.example" }))).data.error, "passkey", "wrong origin");
  assert.equal((await v(await phone.get({ rp: "evil.example" }))).data.error, "passkey", "wrong rp id");
  const once = await phone.get();
  assert.equal((await v(once)).status, 200);
  assert.equal((await v(once)).data.error, "passkey", "a challenge works once");
  // a registration needs the lot's code
  assert.equal((await call("/land/passkey/add", { city: "isidis-procyon", lot: "A3", code: "WRONG", newPasskey: await stranger.create() })).status, 403);
});

test("passkeys can be removed", async () => {
  const { data } = await claim("A4");
  const phone = await authenticator();
  await call("/land/passkey/add", { city: "isidis-procyon", lot: "A4", code: data.code, newPasskey: await phone.create() });
  const rm = await call("/land/passkey/remove", { city: "isidis-procyon", lot: "A4", code: data.code, id: phone.id });
  assert.equal(rm.status, 200); assert.equal(rm.data.passkeys.length, 0);
  assert.equal(lotFile("A4").passkeys, undefined);
});

/* ---------------- one passkey for many lots ---------------- */

test("one passkey can hold several lots, and signing in with it brings them all back", async () => {
  const phone = await authenticator();
  const a = (await claim("A1")).data, b = (await claim("A2")).data;
  const add = await call("/land/passkey/add", { city: "isidis-procyon", lots: [{ lot: "A1", code: a.code }, { lot: "A2", code: b.code }], newPasskey: await phone.create() });
  assert.equal(add.status, 200, JSON.stringify(add.data));
  assert.deepEqual(Object.keys(add.data.lots).sort(), ["A1", "A2"]);
  // a third lot joins the same passkey: its code plus a sign-in with the passkey
  const c = (await claim("A3")).data;
  const link = await call("/land/passkey/add", { city: "isidis-procyon", lots: [{ lot: "A3", code: c.code }], linkPasskey: await phone.get() });
  assert.equal(link.status, 200, JSON.stringify(link.data));
  assert.equal(lotFile("A3").passkeys[0].id, phone.id);
  // new device: one sign-in, three lots
  const s = await call("/land/passkey/signin", { city: "isidis-procyon", passkey: await phone.get() });
  assert.equal(s.status, 200, JSON.stringify(s.data));
  assert.deepEqual(Object.keys(s.data.lots).sort(), ["A1", "A2", "A3"]);
  assert.equal(s.data.lots.A1.record.passkeys, undefined, "public records carry no keys");
  // giving one up drops it from the passkey
  await call("/land/release", { city: "isidis-procyon", lot: "A2", passkey: await phone.get() });
  const s2 = await call("/land/passkey/signin", { city: "isidis-procyon", passkey: await phone.get() });
  assert.deepEqual(Object.keys(s2.data.lots).sort(), ["A1", "A3"]);
});

test("adding a second passkey to many lots can be proven with the first passkey", async () => {
  const phone = await authenticator(), laptop = await authenticator();
  const a = (await claim("A1")).data, b = (await claim("A2")).data;
  await call("/land/passkey/add", { city: "isidis-procyon", lots: [{ lot: "A1", code: a.code }, { lot: "A2", code: b.code }], newPasskey: await phone.create() });
  const add = await call("/land/passkey/add", { city: "isidis-procyon", lots: [{ lot: "A1" }, { lot: "A2" }], passkey: await phone.get(), newPasskey: await laptop.create() });
  assert.equal(add.status, 200, JSON.stringify(add.data));
  assert.equal(lotFile("A2").passkeys.length, 2);
});

test("many-lot passkey calls are refused without proof for every lot", async () => {
  const phone = await authenticator(), stranger = await authenticator();
  const a = (await claim("A1")).data; await claim("A2");
  // A2 has no code given and no passkey: refused, nothing written
  const r = await call("/land/passkey/add", { city: "isidis-procyon", lots: [{ lot: "A1", code: a.code }, { lot: "A2" }], newPasskey: await phone.create() });
  assert.equal(r.status, 403);
  assert.equal(lotFile("A1").passkeys, undefined);
  // linking a passkey that is on no lot
  const l = await call("/land/passkey/add", { city: "isidis-procyon", lots: [{ lot: "A1", code: a.code }], linkPasskey: await stranger.get() });
  assert.equal(l.data.error, "passkey_unknown");
  // signing in with a passkey that is on no lot
  assert.equal((await call("/land/passkey/signin", { city: "isidis-procyon", passkey: await stranger.get() })).data.error, "passkey_unknown");
  // the lot hint does not let a stranger in either
  await call("/land/passkey/add", { city: "isidis-procyon", lot: "A1", code: a.code, newPasskey: await phone.create() });
  assert.equal((await call("/land/passkey/signin", { city: "isidis-procyon", lot: "A1", passkey: await stranger.get() })).data.error, "passkey_unknown");
  assert.equal((await call("/land/passkey/signin", { city: "isidis-procyon", passkey: await phone.get({ tamper: true }) })).status, 403);
});

test("a key card for several lots is checked in one call", async () => {
  const a = (await claim("A1")).data, b = (await claim("A2")).data;
  const v = await call("/land/verify", { city: "isidis-procyon", lots: [{ lot: "A1", code: a.code }, { lot: "A2", code: b.code }, { lot: "A3", code: a.code }] });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  assert.deepEqual(Object.keys(v.data.lots).sort(), ["A1", "A2"]);
  assert.deepEqual(v.data.failed, ["A3"]);
  assert.equal(v.data.lots.A1.record.seal, undefined);
  assert.equal((await call("/land/verify", { city: "isidis-procyon", lots: [{ lot: "A1", code: b.code }] })).status, 403);
});
