import { getStore } from "@netlify/blobs";

// 2025 data is read-only (embedded in index.html). This function stores 2026 data only.
// GET  /api/status -> { locked: <true if ADMIN_PIN is set>, rec: { "<id>": { status, amt, bill, deliver, issued } }, manual: [ { id, name, addr } ] }
// POST /api/status -> { action: "set"|"add"|"delete", ...,  pin }   (pin needed only if ADMIN_PIN env var is set)
const KEY = "data2026";
// Bhog "Issued" can only be marked from 8 Nov 2026, 00:00 India time (= 7 Nov 18:30 UTC).
const BHOG_OPEN = Date.UTC(2026, 10, 8, 18, 30);

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
  const d = await load();

  if (b.action === "set") {
    const id = String(b.id || "");
    const isBill = /^\d{1,4}$/.test(id), isManual = d.manual.some((m) => m.id === id);
    if (!isBill && !isManual) return json({ error: "unknown id" }, 400);
    if (b.status === undefined && b.amt === undefined && b.bill === undefined && b.deliver === undefined && b.issued === undefined) return json({ error: "nothing to set" }, 400);
    if ((b.deliver !== undefined && !isBool(b.deliver)) || (b.issued !== undefined && !isBool(b.issued))) return json({ error: "bad bhog" }, 400);
    if (b.issued === true && notReady()) return json({ error: "bhog_not_ready" }, 400);
    if (b.bill !== undefined && typeof b.bill !== "string") return json({ error: "bad bill no" }, 400);
    if (b.status !== undefined && !okStatus(b.status)) return json({ error: "bad status" }, 400);
    if (b.amt !== undefined && !okAmt(b.amt)) return json({ error: "bad amount" }, 400);
    const x = (d.rec[id] = d.rec[id] || {});
    if (b.status !== undefined) x.status = b.status;
    if (b.amt !== undefined) x.amt = b.amt;
    if (b.deliver !== undefined) { if (b.deliver) x.deliver = true; else delete x.deliver; }
    if (b.issued !== undefined) { if (b.issued) x.issued = true; else delete x.issued; }
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
    if (e.issued === true) d.rec[e.id].issued = true;
    const bn = typeof e.bill === "string" ? e.bill.trim().slice(0, 20) : "";
    if (bn) d.rec[e.id].bill = bn;
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
