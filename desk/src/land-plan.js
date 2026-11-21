// Copied from InterImm/martian-cities web/js/land-plan.js. Keep the two in step: the explorer, the
// deed poster and this desk must agree on lots, ring rules and building limits.
// The land register's plan, as pure functions (no DOM, no three.js) so node can test them and
// the explorer, the deed poster and the hub desk all agree on shapes, addresses and rules.
// The plan file is web/cities/<city>/plots.json, written by tools/plots.mjs.

export const STORY_OFFSET_DAYS = 70491;      // InterImm story date = Earth date + 70,491 days (2219 in 2026)
const RAD = Math.PI / 180;

export function readPlan(json) {
  const f = json.lotFields;
  const lots = json.lots.map(row => {
    const o = {}; f.forEach((k, i) => { o[k] = row[i]; });
    if (o.b2 < o.b1) o.b2 += 360;          // a lot that straddles north
    o.ringInfo = json.rings[o.ring];
    o.zone = o.ringInfo.zone;
    return o;
  });
  const byId = new Map(lots.map(l => [l.id, l]));
  return { ...json, lots, byId };
}

// model frame: X east, Y north. three.js: x = X, z = -Y.
export function polar(core, r, bearingDeg) { const b = bearingDeg * RAD; return [core[0] + Math.sin(b) * r, core[1] + Math.cos(b) * r]; }

export function lotCorners(plan, lot, steps = 1) {
  const pts = [];
  for (let k = 0; k <= steps; k++) pts.push(polar(plan.core, lot.r1, lot.b1 + (lot.b2 - lot.b1) * k / steps));
  for (let k = steps; k >= 0; k--) pts.push(polar(plan.core, lot.r2, lot.b1 + (lot.b2 - lot.b1) * k / steps));
  return pts;
}

// Where a building sits: centre (three.js x, z), the yaw that turns its front (+z) to face the
// street, and the usable frontage and depth.
export function lotFrame(plan, lot) {
  const bm = (lot.b1 + lot.b2) / 2, rm = (lot.r1 + lot.r2) / 2;
  const [X, Y] = polar(plan.core, rm, bm);
  const out = lot.side === 0 ? 1 : -1;               // inner-side lots face out to their street, outer-side lots face in
  const fx = Math.sin(bm * RAD) * out, fz = -Math.cos(bm * RAD) * out;
  return { x: X, z: -Y, yaw: Math.atan2(fx, fz), w: (lot.b2 - lot.b1) * RAD * rm, d: lot.r2 - lot.r1, bearing: bm, radius: rm };
}

export function lotLatLon(plan, lot) {
  const bm = (lot.b1 + lot.b2) / 2, rm = (lot.r1 + lot.r2) / 2, b = bm * RAD;
  const dy = Math.cos(b) * rm, dx = Math.sin(b) * rm, m = plan.geo.metresPerDegree;
  return { lat: plan.geo.lat + dy / m, lon: plan.geo.lon + dx / (m * Math.cos(plan.geo.lat * RAD)) };
}

export function fmtLatLon({ lat, lon }) {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
}

// "117 Pioneer Ring, between Sirius and Terminus avenues" / "开拓者环 117 号（天狼大道与端点大道之间）"
export function lotAddress(plan, lot, lang = 'en') {
  const ring = lot.ringInfo, no = lot.id.slice(1);
  const a = plan.avenues[lot.segment], b = plan.avenues[(lot.segment + 1) % plan.avenues.length];
  const cn = lang === 'cn';
  const short = a.name.replace(/ Avenue$/, ''), shortB = b.name.replace(/ Avenue$/, '');
  return {
    number: no,
    street: cn ? ring.name_cn : ring.name,
    line: cn ? `${ring.name_cn} ${no} 号` : `${no} ${ring.name}`,
    between: cn ? `${a.name_cn}与${b.name_cn}之间` : `between ${short} and ${shortB} avenues`,
    side: cn ? (lot.side === 0 ? '内侧' : '外侧') : (lot.side === 0 ? 'inner side' : 'outer side'),
  };
}

// registry: { lots: { A117: {...}, ... } }. A frontier ring opens when the ring inside it is
// claimed to its threshold; inner rings are always open.
export function ringStatus(plan, registry) {
  const held = registry?.lots || {};
  const rows = plan.rings.map(r => ({ id: r.id, ring: r, total: 0, claimed: 0, open: !r.opens }));
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const l of plan.lots) { const r = rows[l.ring]; r.total++; if (held[l.id]) r.claimed++; }
  for (const r of rows) {
    if (!r.ring.opens) continue;
    const inner = byId.get(r.ring.opens.after);
    r.needs = Math.ceil(inner.total * r.ring.opens.share);
    r.open = inner.open && inner.claimed >= r.needs;
    r.progress = Math.min(1, inner.claimed / (r.needs || 1));
  }
  return rows;
}

export function storyDate(earth = new Date()) {
  const d = new Date(Date.UTC(earth.getUTCFullYear(), earth.getUTCMonth(), earth.getUTCDate()) + STORY_OFFSET_DAYS * 864e5);
  return d.toISOString().slice(0, 10);
}

// Building parameters, cleaned the same way the desk cleans them. Returns a new object.
export function cleanBuilding(plan, zone, b = {}) {
  const kit = plan.building, z = plan.zones[zone];
  const type = z.types.includes(b.type) ? b.type : z.types[0];
  const [lo, hi] = kit.types[type].floors;
  const floors = Math.max(lo, Math.min(hi, z.maxFloors, Math.round(+b.floors || lo)));
  const color = kit.colors[b.color] ? b.color : Object.keys(kit.colors)[0];
  const accent = kit.colors[b.accent] ? b.accent : 'rust';
  const roof = kit.roofs.includes(b.roof) ? b.roof : 'flat';
  const sign = String(b.sign || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, kit.signMax);
  return { type, floors, color, accent, roof, sign };
}

// A stable small number from a string (for tree placement and other harmless variety).
export function hashSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
