import { getStore } from "@netlify/blobs";

// 2025 data is read-only (embedded in index.html). This function stores 2026 data only.
// GET  /api/status -> { locked: <true if ADMIN_PIN is set>, rec: { "<id>": { status, amt, bill, deliver, issued, boxes } }, manual: [ { id, name, addr } ] }
// POST /api/status -> { action: "set"|"add"|"delete"|"restore", ...,  pin }   (pin needed only if ADMIN_PIN env var is set)
const KEY = "data2026";
// Bhog "Issued" can only be marked from 9 Nov 2026, 12:00 noon India time (= 9 Nov 06:30 UTC).
const BHOG_OPEN = Date.UTC(2026, 10, 9, 6, 30);

export default async (req) => {
  const store = getStore({ name: "kalipuja-2026", consistency: "strong" }); // always read the latest saved data
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const load = async () => {
    const d = (await store.get(KEY, { type: "json" })) || {};
    const rec = d.rec || {};
    for (const k in rec) { const x = rec[k]; if (x && x.bhog) { if (x.bhog === "deliver") x.deliver = true; if (x.bhog === "issued") x.issued = true; delete x.bhog; } } // older single-choice data
    return { rec, manual: d.manual || [] };
  };

  if (req.method === "GET") return json({ ...(await load()), locked: !!process.env.ADMIN_PIN });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const pin = process.env.ADMIN_PIN;
  if (pin && b.pin !== pin) return json({ error: "unauthorized" }, 401);
  if (b.action === "verify") return json({ ok: true }); // lets the app check the PIN once, then remember it on that device

  const okAmt = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e9;
  const okStatus = (v) => v === "paid" || v === "due";
  const isBool = (v) => typeof v === "boolean";
  const notReady = () => Date.now() < BHOG_OPEN;
  const okBoxes = (v) => Number.isInteger(v) && v >= 0 && v <= 100000; // how many bhog boxes were issued
  const d = await load();

  if (b.action === "set") {
    const id = String(b.id || "");
    const isBill = /^\d{1,4}$/.test(id), isManual = d.manual.some((m) => m.id === id);
    if (!isBill && !isManual) return json({ error: "unknown id" }, 400);
    if (b.status === undefined && b.amt === undefined && b.bill === undefined && b.deliver === undefined && b.issued === undefined && b.boxes === undefined) return json({ error: "nothing to set" }, 400);
    if (b.boxes !== undefined && b.boxes !== null && !okBoxes(b.boxes)) return json({ error: "bad boxes" }, 400);
    if ((b.deliver !== undefined && !isBool(b.deliver)) || (b.issued !== undefined && !isBool(b.issued))) return json({ error: "bad bhog" }, 400);
    if (b.issued === true && notReady()) return json({ error: "bhog_not_ready" }, 400);
    if (b.bill !== undefined && typeof b.bill !== "string") return json({ error: "bad bill no" }, 400);
    if (b.status !== undefined && !okStatus(b.status)) return json({ error: "bad status" }, 400);
    if (b.amt !== undefined && !okAmt(b.amt)) return json({ error: "bad amount" }, 400);
    const x = (d.rec[id] = d.rec[id] || {});
    if (b.status !== undefined) x.status = b.status;
    if (b.amt !== undefined) x.amt = b.amt;
    if (b.deliver !== undefined) { if (b.deliver) x.deliver = true; else delete x.deliver; }
    if (b.issued !== undefined) { if (b.issued) x.issued = true; else { delete x.issued; delete x.boxes; } }
    if (b.boxes !== undefined) {
      if (b.boxes === null) delete x.boxes;
      else if (!x.issued) return json({ error: "mark bhog as issued first" }, 400);
      else x.boxes = b.boxes;
    }
    if (b.bill !== undefined) { const bn = b.bill.trim().slice(0, 20); if (bn) x.bill = bn; else delete x.bill; }
  } else if (b.action === "add") {
    const e = b.entry || {};
    const name = String(e.name || "").trim().slice(0, 100);
    if (!name || !okAmt(e.amt) || !okStatus(e.status) || !/^m\d{6,}$/.test(String(e.id)) || d.manual.some((m) => m.id === e.id))
      return json({ error: "bad entry" }, 400);
    d.manual.push({ id: e.id, name, addr: String(e.addr || "").trim().slice(0, 200) });
    d.rec[e.id] = { status: e.status, amt: e.amt };
    if (e.issued === true && notReady()) return json({ error: "bhog_not_ready" }, 400);
    if (e.deliver === true) d.rec[e.id].deliver = true;
    if (e.issued === true) { d.rec[e.id].issued = true; if (okBoxes(e.boxes)) d.rec[e.id].boxes = e.boxes; }
    const bn = typeof e.bill === "string" ? e.bill.trim().slice(0, 20) : "";
    if (bn) d.rec[e.id].bill = bn;
  } else if (b.action === "restore") {
    // Replace ALL 2026 data with a backup. Everything is re-validated here; unknown or invalid parts are dropped.
    const src = b.data;
    if (!src || typeof src !== "object" || !src.rec || typeof src.rec !== "object" || Array.isArray(src.rec) || Object.keys(src.rec).length > 20000)
      return json({ error: "bad backup" }, 400);
    const manual = [], seen = new Set(), rec = {};
    for (const m of Array.isArray(src.manual) ? src.manual.slice(0, 5000) : []) {
      const id = m ? String(m.id || "") : "", name = m ? String(m.name || "").trim().slice(0, 100) : "";
      if (!/^m\d{6,}$/.test(id) || !name || seen.has(id)) continue;
      seen.add(id); manual.push({ id, name, addr: String(m.addr || "").trim().slice(0, 200) });
    }
    for (const k in src.rec) {
      if (!/^\d{1,4}$/.test(k) && !seen.has(k)) continue;
      const x = src.rec[k]; if (!x || typeof x !== "object") continue;
      const c = {};
      if (okStatus(x.status)) c.status = x.status;
      if (okAmt(x.amt)) c.amt = x.amt;
      if (typeof x.bill === "string" && x.bill.trim()) c.bill = x.bill.trim().slice(0, 20);
      if (x.deliver === true || x.bhog === "deliver") c.deliver = true;
      if ((x.issued === true || x.bhog === "issued") && !notReady()) c.issued = true; // keeps the 9 Nov rule
      if (c.issued && okBoxes(x.boxes)) c.boxes = x.boxes;
      if (Object.keys(c).length) rec[k] = c;
    }
    d.manual = manual; d.rec = rec;
  } else if (b.action === "delete") {
    const id = String(b.id || "");
    if (!d.manual.some((m) => m.id === id)) return json({ error: "only manual entries can be deleted" }, 400);
    d.manual = d.manual.filter((m) => m.id !== id);
    delete d.rec[id];
  } else return json({ error: "bad action" }, 400);

  await store.setJSON(KEY, d);
  return json(d);
};

export const config = { path: "/api/status" };
