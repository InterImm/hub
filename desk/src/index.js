// InterImm front desk: the one small server behind interimm.org/hub.
//
// The hub itself is a static Jekyll site on GitHub Pages; the company files in
// _companies/ are the register. This Worker is the only thing that writes to
// them, so founders never need a GitHub account:
//
//   POST /register      a new company -> pull request for the registrar to approve
//   POST /verify        check a company's edit code, return its current record
//   POST /update        edit code + new jobs/ads/notices/profile -> commit to the site branch
//   POST /admin/reset   registrar only: issue a new edit code for a company
//
// Ownership is a random edit code shown once on the certificate. The company
// file keeps only its SHA-256 (field `seal`). Every public endpoint also needs a
// Cloudflare Turnstile token. See desk/README.md for setup.

import { parse, stringify } from "yaml";

export const STORY_OFFSET_DAYS = 70491; // InterImm story date = Earth date + 70,491 days (year 2219 in 2026)
export const POST_DAYS = 31; // a job or ad runs ~30 sols
export const CAPS = { jobs: 3, ads: 2, notices: 5 };
const LIMITS = { name: 60, name_en: 80, about: 600, link: 200, founder: 40, title: 60, perk: 140, headline: 40, body: 160, notice: 120 };
const SKILLS = ["tech", "craft", "data", "people"];
const PLACES = ["city", "frontier", "orbit"];
const RISKS = ["low", "mid", "high"];

// Seats offered on the registration form, written the way the existing register writes them.
export const SEATS = {
  nanhe: "火星南河城(Procyon City)",
  betelgeuse: "火星天狼城(Betelgeuse City)",
  sirius: "火星参宿城(Sirius City)",
  horizon: "火星视界城(Horizon City)",
  singularity: "火星奇点城(Singularity City)",
  bolide: "火星星坠城(Bolide City)",
  trantor: "火星川陀城(Trantor City)",
  terminus: "火星端点城(Terminus City)",
  kroran: "火星楼兰城(Kroran City)",
  atlantis: "火星亚特兰帝斯城(Atlantis City)",
  moon: "月球",
  orbit: "太空城市",
  earth: "地球",
};
export const TRADES = ["科研", "教育", "运输", "农业", "食品", "能源矿产", "生物科技", "医疗技术", "互联网", "通讯", "投资金融", "休闲娱乐", "艺术", "新闻媒体", "建筑业", "服务业", "旅游观光", "环境保护", "其他"];

const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: no I, L, O, U
const KEY_RE = /^company-[A-Za-z0-9_-]{4,64}$/;
const MAX_BODY = 32 * 1024;

export class DeskError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get("Origin"), env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/") return json({ ok: true, service: "InterImm front desk" }, 200, cors);
      if (request.method !== "POST") throw new DeskError(404, "not_found");
      const body = await readJson(request);
      if (url.pathname === "/admin/reset") return json(await adminReset(body, request, env), 200, cors);
      if (!cors["Access-Control-Allow-Origin"]) throw new DeskError(403, "origin", "This desk only serves interimm.org pages.");
      await checkTurnstile(body.turnstile, request, env);
      if (url.pathname === "/register") return json(await register(body, env), 200, cors);
      if (url.pathname === "/verify") return json(await verify(body, env), 200, cors);
      if (url.pathname === "/update") return json(await update(body, env), 200, cors);
      throw new DeskError(404, "not_found");
    } catch (e) {
      if (e instanceof DeskError) return json({ error: e.code, message: e.message }, e.status, cors);
      console.error(e && e.stack || e);
      return json({ error: "internal", message: "The desk could not finish this. Please try again later." }, 502, cors);
    }
  },
};

/* ---------------- endpoints ---------------- */

export async function register(body, env) {
  const name = text(body.name, LIMITS.name, true, "name");
  const nameEn = text(body.name_en, LIMITS.name_en);
  const seat = SEATS[body.seat];
  if (!seat) throw new DeskError(400, "seat", "Pick a seat from the list.");
  const trade = TRADES.includes(body.trade) ? body.trade : "其他";
  const about = text(body.about, LIMITS.about, true, "about");
  const founder = text(body.founder, LIMITS.founder, true, "founder");
  const link = optionalLink(body.link);

  const key = "company-" + randomString(20, "abcdefghijklmnopqrstuvwxyz0123456789");
  const code = newCode();
  const today = isoDay(new Date());
  const front = {
    _id: key.slice("company-".length),
    name,
    ...(nameEn ? { name_en: nameEn } : {}),
    founded: isoDay(storyDate(new Date())),
    base: seat,
    category: trade,
    about,
    ...(link ? { link } : {}),
    author: founder,
    date: today,
    seal: await seal(key, code),
    jobs: [],
    ads: [],
    notices: [],
  };

  const gh = github(env);
  const branch = `register/${key}`;
  const base = await gh(`/git/ref/heads/${encodeURIComponent(env.GITHUB_BRANCH)}`);
  await gh(`/git/refs`, { method: "POST", body: { ref: `refs/heads/${branch}`, sha: base.object.sha } });
  await gh(`/contents/${companyPath(key)}`, {
    method: "PUT",
    body: { message: `Register ${name}`, content: b64encode(serialize(front, "")), branch, committer: committer(env) },
  });
  const pr = await gh(`/pulls`, {
    method: "POST",
    body: {
      title: `New company: ${name}`,
      head: branch,
      base: env.GITHUB_BRANCH,
      body: [
        `Filed through the hub's registration desk.`,
        ``,
        `| | |`, `| --- | --- |`,
        `| Name | ${mdCell(name)}${nameEn ? ` / ${mdCell(nameEn)}` : ""} |`,
        `| Seat | ${mdCell(seat)} |`, `| Trade | ${mdCell(trade)} |`, `| Founder | ${mdCell(founder)} |`,
        ``, `> ${mdCell(about)}`, ``,
        `Merge to put it on the register. The founder already holds the edit code; only its hash is in the file.`,
      ].join("\n"),
    },
  });
  try { await gh(`/issues/${pr.number}/labels`, { method: "POST", body: { labels: ["new-company"] } }); } catch {}
  return { ok: true, key, code, pending: true, review: pr.number };
}

export async function verify(body, env) {
  const key = companyKey(body.key);
  const doc = await readCompany(env, key, { allowPending: true });
  await checkSeal(key, body.code, doc.front);
  return { ok: true, key, pending: doc.pending, company: publicRecord(doc.front) };
}

export async function update(body, env) {
  const key = companyKey(body.key);
  for (let attempt = 0; ; attempt++) {
    const doc = await readCompany(env, key);
    await checkSeal(key, body.code, doc.front);
    const front = applyUpdate(doc.front, body, new Date());
    try {
      await github(env)(`/contents/${companyPath(key)}`, {
        method: "PUT",
        body: { message: `Office update: ${plainName(front.name)} (${key})`, content: b64encode(serialize(front, doc.rest)), sha: doc.sha, branch: env.GITHUB_BRANCH, committer: committer(env) },
      });
      return { ok: true, key, company: publicRecord(front) };
    } catch (e) {
      if (e.ghStatus === 409 && attempt === 0) continue; // someone else saved first: re-read and apply again
      throw e;
    }
  }
}

export async function adminReset(body, request, env) {
  const given = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_KEY || !given || !safeEqual(given, env.ADMIN_KEY)) throw new DeskError(401, "admin", "Wrong registrar key.");
  const key = companyKey(body.key);
  const doc = await readCompany(env, key);
  const code = newCode();
  doc.front.seal = await seal(key, code);
  await github(env)(`/contents/${companyPath(key)}`, {
    method: "PUT",
    body: { message: `New edit code for ${plainName(doc.front.name)} (${key})`, content: b64encode(serialize(doc.front, doc.rest)), sha: doc.sha, branch: env.GITHUB_BRANCH, committer: committer(env) },
  });
  return { ok: true, key, code };
}

/* ---------------- the update rules ---------------- */

// Takes the stored front matter and what the Office sent, returns new front matter.
// Only fields present in the request change. Lists are replaced wholesale, but items the
// company already had keep their original dates, so nobody can backdate or extend a post
// except through `renew`.
export function applyUpdate(front, body, now) {
  const out = { ...front };
  const today = isoDay(now);
  const expiry = isoDay(new Date(now.getTime() + POST_DAYS * 864e5));

  if (body.profile && typeof body.profile === "object") {
    const p = body.profile;
    if (p.name !== undefined) out.name = text(p.name, LIMITS.name, true, "name");
    if (p.name_en !== undefined) { const v = text(p.name_en, LIMITS.name_en); if (v) out.name_en = v; else delete out.name_en; }
    if (p.about !== undefined) out.about = text(p.about, LIMITS.about, true, "about");
    if (p.link !== undefined) { const v = optionalLink(p.link); if (v) out.link = v; else delete out.link; }
  }

  if (body.jobs !== undefined) {
    const old = list(front.jobs);
    const jobs = list(body.jobs).map(j => {
      const title = text(j.title, LIMITS.title, true, "job title");
      const prev = old.find(o => o.id && o.id === j.id);
      return {
        id: prev ? prev.id : randomString(8, "abcdefghijkmnpqrstuvwxyz23456789"),
        title,
        perk: text(j.perk, LIMITS.perk),
        skill: SKILLS.includes(j.skill) ? j.skill : "people",
        place: PLACES.includes(j.place) ? j.place : "city",
        risk: RISKS.includes(j.risk) ? j.risk : "mid",
        pay: clampInt(j.pay, 50, 500, 180),
        posted: prev ? prev.posted : today,
        expires: j.renew || !prev ? expiry : prev.expires,
      };
    }).filter(j => j.expires >= today);
    if (jobs.length > CAPS.jobs) throw new DeskError(400, "caps", `At most ${CAPS.jobs} open jobs.`);
    out.jobs = jobs;
  }

  if (body.ads !== undefined) {
    const old = list(front.ads);
    const ads = list(body.ads).map(a => {
      const prev = old.find(o => o.id && o.id === a.id);
      return {
        id: prev ? prev.id : randomString(8, "abcdefghijkmnpqrstuvwxyz23456789"),
        headline: text(a.headline, LIMITS.headline, true, "headline"),
        body: text(a.body, LIMITS.body),
        posted: prev ? prev.posted : today,
        expires: a.renew || !prev ? expiry : prev.expires,
      };
    }).filter(a => a.expires >= today);
    if (ads.length > CAPS.ads) throw new DeskError(400, "caps", `At most ${CAPS.ads} ads.`);
    out.ads = ads;
  }

  if (body.notices !== undefined) {
    const old = list(front.notices);
    out.notices = list(body.notices).map(n => {
      const prev = old.find(o => o.id && o.id === n.id);
      return {
        id: prev ? prev.id : randomString(8, "abcdefghijkmnpqrstuvwxyz23456789"),
        text: text(n.text, LIMITS.notice, true, "notice"),
        date: prev ? prev.date : today,
      };
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, CAPS.notices);
  }

  out.updated = today;
  return out;
}

// What the Office may see: everything except the seal.
export function publicRecord(front) {
  const { seal: _seal, ...rest } = front;
  return rest;
}

/* ---------------- edit codes ---------------- */

export function newCode() {
  const raw = randomString(16, CODE_ALPHABET); // 80 bits
  return raw.match(/.{4}/g).join("-");
}

export function normalizeCode(code) {
  return String(code || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

export async function seal(key, code) {
  return sha256hex(`${key}:${normalizeCode(code)}`);
}

async function checkSeal(key, code, front) {
  if (!front.seal) throw new DeskError(403, "unclaimed", "This company has no edit code yet. Ask the registrar to issue one.");
  if (!code || !safeEqual(await seal(key, code), String(front.seal))) throw new DeskError(403, "code", "That edit code does not match this company.");
}

/* ---------------- GitHub ---------------- */

function github(env) {
  return async function gh(path, init = {}) {
    const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
      method: init.method || "GET",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "interimm-front-desk",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 300)}`);
      err.ghStatus = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  };
}

async function readCompany(env, key, { allowPending = false } = {}) {
  const gh = github(env);
  const get = ref => gh(`/contents/${companyPath(key)}?ref=${encodeURIComponent(ref)}`);
  let file, pending = false;
  try {
    file = await get(env.GITHUB_BRANCH);
  } catch (e) {
    if (e.ghStatus !== 404) throw e;
    if (!allowPending) throw new DeskError(404, "unknown", "No company with that register key.");
    try { file = await get(`register/${key}`); pending = true; }
    catch (e2) { if (e2.ghStatus === 404) throw new DeskError(404, "unknown", "No company with that register key."); throw e2; }
  }
  const { front, rest } = splitFrontMatter(b64decode(file.content));
  return { front, rest, sha: file.sha, pending };
}

/* ---------------- files ---------------- */

export function companyPath(key) { return `_companies/${key}.md`; }

export function splitFrontMatter(textIn) {
  const t = textIn.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const m = t.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/);
  if (!m) throw new Error("company file has no front matter");
  return { front: parse(m[1]) || {}, rest: m[2] };
}

export function serialize(front, rest) {
  // Jekyll reads front matter as YAML 1.1, where yes/no and bare dates are not strings,
  // so write in 1.1 style: such strings come out quoted and keep their meaning.
  return `---\n${stringify(front, { lineWidth: 0, version: "1.1" })}---\n${rest || ""}`;
}

/* ---------------- small helpers ---------------- */

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const h = { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
  if (origin && allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

async function readJson(request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) throw new DeskError(413, "too_large", "That is more than the desk accepts at once.");
  try { const v = JSON.parse(raw || "{}"); if (v && typeof v === "object") return v; } catch {}
  throw new DeskError(400, "json", "The desk could not read this request.");
}

async function checkTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) {
    if (env.DEV === "1") return;
    throw new DeskError(503, "config", "The desk is not configured yet.");
  }
  if (!token) throw new DeskError(400, "turnstile", "Please complete the check and try again.");
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const out = await res.json().catch(() => ({}));
  if (!out.success) throw new DeskError(400, "turnstile", "The check did not pass. Please try again.");
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

function committer(env) { return { name: "InterImm Front Desk", email: env.COMMITTER_EMAIL || "desk@interimm.org" }; }

function companyKey(k) {
  if (typeof k !== "string" || !KEY_RE.test(k)) throw new DeskError(400, "key", "That is not a register key.");
  return k;
}

function text(v, max, required = false, label = "text") {
  const s = String(v ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (required && !s) throw new DeskError(400, "missing", `Please fill in the ${label}.`);
  if ([...s].length > max) throw new DeskError(400, "too_long", `The ${label} can be at most ${max} characters.`);
  return s;
}

function optionalLink(v) {
  const s = text(v, LIMITS.link);
  if (!s) return "";
  if (!/^https?:\/\/[^\s<>"']+$/i.test(s)) throw new DeskError(400, "link", "The link must start with http:// or https://.");
  return s;
}

function clampInt(v, lo, hi, dflt) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; }
function list(v) { return Array.isArray(v) ? v.filter(x => x && typeof x === "object") : []; }
function plainName(n) { return String(Array.isArray(n) ? n[0] : n).slice(0, 60); }
function mdCell(s) { return String(s).replace(/\|/g, "\\|").replace(/\n+/g, " "); }

export function storyDate(d) { return new Date(d.getTime() + STORY_OFFSET_DAYS * 864e5); }
export function isoDay(d) { return d.toISOString().slice(0, 10); }

function randomString(n, alphabet) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length]; // both alphabets used divide 256 or are close enough for ids
  return s;
}

async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function b64encode(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function b64decode(s) {
  const bin = atob(String(s).replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
