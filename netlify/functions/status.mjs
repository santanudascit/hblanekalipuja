import { getStore } from "@netlify/blobs";

// 2025 data is read-only (embedded in index.html). This function stores 2026 data only.
// GET  /api/status -> { rec: { "<id>": { status, amt, bill } }, manual: [ { id, name, addr } ] }
// POST /api/status -> { action: "set"|"add"|"delete", ...,  pin }   (pin needed only if ADMIN_PIN env var is set)
const KEY = "data2026";

export default async (req) => {
  const store = getStore("kalipuja-2026");
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const load = async () => {
    const d = (await store.get(KEY, { type: "json" })) || {};
    return { rec: d.rec || {}, manual: d.manual || [] };
  };

  if (req.method === "GET") return json(await load());
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const pin = process.env.ADMIN_PIN;
  if (pin && b.pin !== pin) return json({ error: "unauthorized" }, 401);

  const okAmt = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1e9;
  const okStatus = (v) => v === "paid" || v === "due";
  const d = await load();

  if (b.action === "set") {
    const id = String(b.id || "");
    const isBill = /^\d{1,4}$/.test(id), isManual = d.manual.some((m) => m.id === id);
    if (!isBill && !isManual) return json({ error: "unknown id" }, 400);
    if (b.status === undefined && b.amt === undefined && b.bill === undefined) return json({ error: "nothing to set" }, 400);
    if (b.bill !== undefined && typeof b.bill !== "string") return json({ error: "bad bill no" }, 400);
    if (b.status !== undefined && !okStatus(b.status)) return json({ error: "bad status" }, 400);
    if (b.amt !== undefined && !okAmt(b.amt)) return json({ error: "bad amount" }, 400);
    const x = (d.rec[id] = d.rec[id] || {});
    if (b.status !== undefined) x.status = b.status;
    if (b.amt !== undefined) x.amt = b.amt;
    if (b.bill !== undefined) { const bn = b.bill.trim().slice(0, 20); if (bn) x.bill = bn; else delete x.bill; }
  } else if (b.action === "add") {
    const e = b.entry || {};
    const name = String(e.name || "").trim().slice(0, 100);
    if (!name || !okAmt(e.amt) || !okStatus(e.status) || !/^m\d{6,}$/.test(String(e.id)) || d.manual.some((m) => m.id === e.id))
      return json({ error: "bad entry" }, 400);
    d.manual.push({ id: e.id, name, addr: String(e.addr || "").trim().slice(0, 200) });
    d.rec[e.id] = { status: e.status, amt: e.amt };
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
