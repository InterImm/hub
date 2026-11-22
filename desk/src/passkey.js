// Passkeys for lot holders (WebAuthn, checked here with WebCrypto; no library).
//
// A holder can add passkeys to a lot with its edit code. The lot record keeps each passkey's
// public key (never shown in api/land.json); the device or password manager keeps the private
// key and syncs it across the holder's devices. A passkey then works wherever the code does.
//
// Challenges are stateless: an HMAC-signed token (city, time, nonce) that the browser signs
// inside clientDataJSON. A used nonce is remembered in KV until the token expires.

import { DeskError, sha256hex } from "./index.js";

export const RP_ID = "cities.interimm.org";
export const PASSKEY_ORIGINS = ["https://cities.interimm.org"];
export const MAX_PASSKEYS = 5;
const TOKEN_TTL = 5 * 60 * 1000;
const ALGS = { "-7": "ES256", "-257": "RS256" };

/* ---------------- challenges ---------------- */

export async function makeChallenge(env, city, now = Date.now()) {
  const body = b64url(new TextEncoder().encode(JSON.stringify({ c: city, t: now, n: b64url(crypto.getRandomValues(new Uint8Array(12))) })));
  return `${body}.${b64url(await hmac(env, body))}`;
}

async function checkChallenge(env, b64Challenge, city) {
  let token;
  try { token = new TextDecoder().decode(unb64url(b64Challenge)); } catch { throw bad(); }
  const [body, mac] = token.split(".");
  if (!body || !mac || !safeEq(b64url(await hmac(env, body)), mac)) throw bad();
  let c;
  try { c = JSON.parse(new TextDecoder().decode(unb64url(body))); } catch { throw bad(); }
  if (c.c !== city || !(Date.now() - c.t < TOKEN_TTL && c.t <= Date.now() + 60000)) throw bad("This sign-in took too long. Please try again.");
  if (env.CONTACTS) {
    const k = `pk-nonce:${c.n}`;
    if (await env.CONTACTS.get(k)) throw bad();
    await env.CONTACTS.put(k, "1", { expirationTtl: 600 });
  }
}

/* ---------------- registration ---------------- */

// What the browser sends after navigator.credentials.create(): the credential id, its public
// key as SPKI (PublicKeyCredential.response.getPublicKey()), its algorithm, and clientDataJSON.
export async function checkRegistration(env, city, p) {
  const alg = String(p?.alg);
  if (!ALGS[alg]) throw new DeskError(400, "passkey", "This device offers a kind of passkey the desk does not support.");
  const id = String(p.id || "");
  if (!/^[A-Za-z0-9_-]{16,400}$/.test(id) || !p.spki || String(p.spki).length > 1200) throw bad();
  const cd = parseClientData(p.clientDataJSON);
  if (cd.type !== "webauthn.create") throw bad();
  checkOrigin(env, cd.origin);
  await checkChallenge(env, cd.challenge, city);
  await importKey(alg, p.spki); // a key that does not import is refused here, not at sign-in
  return { id, spki: String(p.spki), alg: Number(alg), name: String(p.name || "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 40), added: new Date().toISOString().slice(0, 10) };
}

/* ---------------- sign-in ---------------- */

// What the browser sends after navigator.credentials.get(): id, clientDataJSON,
// authenticatorData and signature (all base64url).
export async function checkAssertion(env, city, passkeys, a) {
  const pk = (passkeys || []).find(k => k.id === a?.id);
  if (!pk) throw new DeskError(403, "passkey_unknown", "That passkey is not on this lot.");
  const cd = parseClientData(a.clientDataJSON);
  if (cd.type !== "webauthn.get") throw bad();
  checkOrigin(env, cd.origin);
  await checkChallenge(env, cd.challenge, city);
  const auth = unb64url(a.authenticatorData);
  if (auth.length < 37) throw bad();
  const rpHash = hexBytes(await sha256hex(env.PASSKEY_RP_ID || RP_ID));
  if (!eqBytes(auth.slice(0, 32), rpHash)) throw bad();
  if (!(auth[32] & 0x01)) throw bad(); // user present
  const cdHash = new Uint8Array(await crypto.subtle.digest("SHA-256", unb64url(a.clientDataJSON)));
  const signed = new Uint8Array(auth.length + 32); signed.set(auth); signed.set(cdHash, auth.length);
  const key = await importKey(String(pk.alg), pk.spki);
  let sig = unb64url(a.signature);
  const ok = String(pk.alg) === "-7"
    ? await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToRaw(sig), signed)
    : await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, sig, signed);
  if (!ok) throw new DeskError(403, "code", "That passkey did not sign in.");
  return pk;
}

/* ---------------- helpers ---------------- */

function bad(msg) { return new DeskError(400, "passkey", msg || "The passkey sign-in could not be checked. Please try again."); }

function parseClientData(b64) {
  try { return JSON.parse(new TextDecoder().decode(unb64url(b64))); } catch { throw bad(); }
}
function checkOrigin(env, origin) {
  const ok = String(env.PASSKEY_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!(ok.length ? ok : PASSKEY_ORIGINS).includes(origin)) throw bad();
}
async function importKey(alg, spki) {
  const raw = unb64url(spki);
  try {
    return alg === "-7"
      ? await crypto.subtle.importKey("spki", raw, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"])
      : await crypto.subtle.importKey("spki", raw, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  } catch { throw bad(); }
}
async function hmac(env, s) {
  const secret = env.PASSKEY_SECRET || env.ADMIN_KEY;
  if (!secret) throw new DeskError(503, "config", "The desk is not configured yet.");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("land-passkey:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(s)));
}

// WebAuthn ES256 signatures are DER; WebCrypto wants r||s, 32 bytes each.
export function derToRaw(der) {
  if (der.length === 64) return der;
  let i = 2; if (der[1] & 0x80) i += der[1] & 0x7f;
  const read = () => { if (der[i++] !== 0x02) throw bad(); const n = der[i++]; let v = der.slice(i, i + n); i += n; while (v.length > 32 && v[0] === 0) v = v.slice(1); const out = new Uint8Array(32); out.set(v, 32 - v.length); return out; };
  const r = read(), s = read(), out = new Uint8Array(64); out.set(r); out.set(s, 32); return out;
}

export function b64url(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function unb64url(s) { const t = String(s || "").replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(t + "===".slice((t.length + 3) % 4)), c => c.charCodeAt(0)); }
function hexBytes(h) { return Uint8Array.from(h.match(/../g), x => parseInt(x, 16)); }
function eqBytes(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
function safeEq(a, b) { return a.length === b.length && eqBytes(new TextEncoder().encode(a), new TextEncoder().encode(b)); }
