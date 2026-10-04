// Run with `npm test` (Node 20+). GitHub and Turnstile are faked in memory.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import worker, { applyUpdate, splitFrontMatter, serialize, seal, newCode, normalizeCode } from "../src/index.js";

const ORIGIN = "https://interimm.org";
const env = { GITHUB_REPO: "InterImm/hub", GITHUB_BRANCH: "gh-pages", GITHUB_TOKEN: "t", ALLOWED_ORIGINS: ORIGIN, TURNSTILE_SECRET: "s", ADMIN_KEY: "registrar-key" };

// ---- a tiny in-memory GitHub ----
let branches, files, pulls, turnstileOk;
const b64 = s => Buffer.from(s, "utf8").toString("base64");
const unb64 = s => Buffer.from(s, "base64").toString("utf8");
const reply = (status, data) => new Response(data === undefined ? null : JSON.stringify(data), { status });

beforeEach(() => {
  branches = { "gh-pages": "base-sha" };
  files = { "gh-pages": {} };
  pulls = [];
  turnstileOk = true;
});

globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.startsWith("https://challenges.cloudflare.com/")) return reply(200, { success: turnstileOk });
  const m = url.match(/^https:\/\/api\.github\.com\/repos\/InterImm\/hub(\/[^?]*)(?:\?ref=(.*))?$/);
  if (!m) throw new Error("unexpected fetch " + url);
  const [, path, refRaw] = m;
  const body = init.body ? JSON.parse(init.body) : null;
  const method = init.method || "GET";
  if (method === "GET" && path.startsWith("/git/ref/heads/")) return reply(200, { object: { sha: branches[decodeURIComponent(path.slice(15))] } });
  if (method === "POST" && path === "/git/refs") { const b = body.ref.replace("refs/heads/", ""); branches[b] = body.sha; files[b] = { ...files["gh-pages"] }; return reply(201, {}); }
  if (path.startsWith("/contents/")) {
    const p = path.slice(10);
    if (method === "GET") {
      const ref = decodeURIComponent(refRaw);
      const f = files[ref] && files[ref][p];
      return f ? reply(200, { content: b64(f.text), sha: f.sha }) : reply(404, { message: "Not Found" });
    }
    if (method === "PUT") {
      const cur = files[body.branch][p];
      if (cur && cur.sha !== body.sha) return reply(409, { message: "conflict" });
      files[body.branch][p] = { text: unb64(body.content), sha: "sha-" + Math.random() };
      return reply(200, {});
    }
  }
  if (method === "POST" && path === "/pulls") { pulls.push(body); return reply(201, { number: 300 + pulls.length }); }
  if (method === "POST" && /^\/issues\/\d+\/labels$/.test(path)) return reply(200, []);
  throw new Error(`unexpected ${method} ${path}`);
};

const call = async (path, body, headers = {}) => {
  const res = await worker.fetch(new Request("https://desk.interimm.org" + path, { method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers }, body: JSON.stringify({ turnstile: "tok", ...body }) }), env);
  return { status: res.status, data: await res.json() };
};

const merge = key => { files["gh-pages"][`_companies/${key}.md`] = files[`register/${key}`][`_companies/${key}.md`]; };
const stored = key => splitFrontMatter(files["gh-pages"][`_companies/${key}.md`].text).front;

const filing = { name: "红灯笼茶馆", name_en: "Red Lantern Teahouse", seat: "nanhe", trade: "食品", about: "Tea under paper lanterns.", founder: "L" };

test("register opens a PR with a sealed file and returns the code once", async () => {
  const { status, data } = await call("/register", filing);
  assert.equal(status, 200);
  assert.match(data.key, /^company-[a-z0-9]{20}$/);
  assert.match(data.code, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.equal(pulls.length, 1);
  const text = files[`register/${data.key}`][`_companies/${data.key}.md`].text;
  assert.ok(!text.includes(data.code), "code itself is never stored");
  const front = splitFrontMatter(text).front;
  assert.equal(front.seal, await seal(data.key, data.code));
  assert.equal(front.base, "火星南河城(Procyon City)");
  assert.match(front.founded, /^22\d\d-\d\d-\d\d$/);
});

test("verify works on a pending company and after merge, and rejects a wrong code", async () => {
  const { data: reg } = await call("/register", filing);
  let r = await call("/verify", { key: reg.key, code: reg.code.toLowerCase().replace(/-/g, " ") });
  assert.equal(r.status, 200);
  assert.equal(r.data.pending, true);
  assert.equal(r.data.company.seal, undefined, "seal never leaves the desk");
  merge(reg.key);
  r = await call("/verify", { key: reg.key, code: reg.code });
  assert.equal(r.data.pending, false);
  r = await call("/verify", { key: reg.key, code: "AAAA-BBBB-CCCC-DDDD" });
  assert.equal(r.status, 403);
  assert.equal(r.data.error, "code");
});

test("update needs a merged company, keeps dates, enforces caps", async () => {
  const { data: reg } = await call("/register", filing);
  let r = await call("/update", { key: reg.key, code: reg.code, jobs: [{ title: "Tea master" }] });
  assert.equal(r.status, 404, "pending companies cannot publish yet");
  merge(reg.key);
  r = await call("/update", { key: reg.key, code: reg.code, jobs: [{ title: "Tea master", skill: "craft", pay: 9999 }], ads: [{ headline: "Tea at the last tram", body: "Open late." }], notices: [{ text: "Now pouring first flush" }] });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  let f = stored(reg.key);
  assert.equal(f.jobs.length, 1);
  assert.equal(f.jobs[0].pay, 500, "pay is clamped");
  const { id, posted } = f.jobs[0];
  r = await call("/update", { key: reg.key, code: reg.code, jobs: [{ id, title: "Head tea master", posted: "1999-01-01", expires: "2999-01-01" }, { title: "Server" }] });
  f = stored(reg.key);
  assert.equal(f.jobs[0].posted, posted, "client cannot backdate");
  assert.notEqual(f.jobs[0].expires, "2999-01-01", "client cannot extend except by renew");
  assert.equal(f.ads.length, 1, "lists not sent stay as they were");
  r = await call("/update", { key: reg.key, code: reg.code, jobs: [{ title: "a" }, { title: "b" }, { title: "c" }, { title: "d" }] });
  assert.equal(r.status, 400);
  assert.equal(r.data.error, "caps");
  r = await call("/update", { key: reg.key, code: "WRONG", jobs: [] });
  assert.equal(r.status, 403);
});

test("expired posts drop out on the next save; renew extends", () => {
  const front = { name: "X", jobs: [{ id: "old", title: "Old", posted: "2026-08-01", expires: "2026-09-01" }, { id: "keep", title: "Keep", posted: "2026-09-20", expires: "2026-10-10" }] };
  const now = new Date("2026-10-04T00:00:00Z");
  let out = applyUpdate(front, { jobs: front.jobs }, now);
  assert.deepEqual(out.jobs.map(j => j.id), ["keep"]);
  out = applyUpdate(front, { jobs: [{ id: "keep", title: "Keep", renew: true }] }, now);
  assert.equal(out.jobs[0].expires, "2026-11-04");
});

test("bad input is refused politely", async () => {
  merge((await call("/register", filing)).data.key);
  assert.equal((await call("/register", { ...filing, seat: "atlantis-on-earth" })).data.error, "seat");
  assert.equal((await call("/register", { ...filing, name: "" })).data.error, "missing");
  assert.equal((await call("/register", { ...filing, link: "javascript:alert(1)" })).data.error, "link");
  assert.equal((await call("/verify", { key: "../../etc/passwd", code: "x" })).data.error, "key");
  turnstileOk = false;
  assert.equal((await call("/register", filing)).data.error, "turnstile");
});

test("unknown origins and missing admin key are refused", async () => {
  let r = await call("/register", filing, { Origin: "https://evil.example" });
  assert.equal(r.status, 403);
  r = await call("/admin/reset", { key: "company-abcd1234" });
  assert.equal(r.status, 401);
});

test("registrar can issue a new code for a legacy company", async () => {
  const key = "company-1487137522587-spacex";
  const legacy = readFileSync(new URL(`../../_companies/${key}.md`, import.meta.url), "utf8");
  files["gh-pages"][`_companies/${key}.md`] = { text: legacy, sha: "s0" };
  let r = await call("/verify", { key, code: "AAAA-AAAA-AAAA-AAAA" });
  assert.equal(r.data.error, "unclaimed");
  r = await call("/admin/reset", { key }, { Authorization: "Bearer registrar-key" });
  assert.equal(r.status, 200);
  r = await call("/update", { key, code: r.data.code, notices: [{ text: "Back on the register" }] });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const f = stored(key);
  assert.deepEqual(f.base, ["美国加利福利亚州霍桑（2002 ～ 2039）", "近地轨道 X 空间站（2039 ～ 2041）"], "legacy fields survive");
  assert.match(f.about, /2041 年/);
});

test("every existing company file survives a parse and write unchanged in meaning", () => {
  const dir = new URL("../../_companies/", import.meta.url);
  for (const name of readdirSync(dir)) {
    const text = readFileSync(new URL(name, dir), "utf8");
    const a = splitFrontMatter(text);
    const b = splitFrontMatter(serialize(a.front, a.rest));
    assert.deepEqual(b.front, a.front, name);
  }
});

test("edit codes are easy to read back", () => {
  const c = newCode();
  assert.equal(normalizeCode(c.toLowerCase().replace(/-/g, " ")), c.replace(/-/g, ""));
  assert.equal(normalizeCode("o0il-1"), "00111");
});
