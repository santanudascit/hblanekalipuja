import { getStore } from "@netlify/blobs";

// 2025 data is read-only (embedded in index.html). This function stores 2026 data only.
// GET  /api/status -> { locked: <true if ADMIN_PIN is set>, rec: { "<id>": { status, amt, bill, deliver, issued, boxes } }, manual: [ { id, name, addr } ],
//                       base2025: [ { cn, name, addr, amt, st, note, book } ]  (only present after a FULL restore; otherwise the page uses the 2025 bills built into index.html),
//                       bhogOnly: [ { id, name, boxes } ]  (bhog issued to people without any bill),
//                       expenses: [ { id, name, note, date, type: "full"|"partial", pays: [ { id, amt, date } ] } ] }
// POST /api/status -> { action: "set"|"add"|"delete"|"restore"|"addExpense"|"addPayment"|"delPayment"|"delExpense"|"addIncome"|"delIncome"|"restoreFull"|"addBhogOnly"|"setBhogOnly"|"delBhogOnly", ...,  pin }   (pin needed only if ADMIN_PIN env var is set)
const KEY = "data2026";
const BASE_KEY = "base2025"; // 2025 bills, only stored here when a full backup has been restored
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
    return { rec, manual: d.manual || [], expenses: Array.isArray(d.expenses) ? d.expenses : [], income: Array.isArray(d.income) ? d.income : [], bhogOnly: Array.isArray(d.bhogOnly) ? d.bhogOnly : [] };
  };

  if (req.method === "GET") {
    const base = await store.get(BASE_KEY, { type: "json" }); // 2025 bills saved by a full restore (optional)
    return json({ ...(await load()), locked: !!process.env.ADMIN_PIN, ...(Array.isArray(base) && base.length ? { base2025: base } : {}) });
  }
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
  const okDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
  const okPay = (p) => !!p && typeof p === "object" && /^p\d{6,}$/.test(String(p.id)) && typeof p.amt === "number" && Number.isFinite(p.amt) && p.amt > 0 && p.amt <= 1e9 && okDate(p.date);
  // optional sub category text on a payment (only kept when not empty)
  const withSub = (o, v) => { const t = String(v == null ? "" : v).trim().slice(0, 100); if (t) o.sub = t; return o; };
  // validates one expense (and its payments); returns a clean copy or null
  const cleanExp = (e) => {
    if (!e || typeof e !== "object" || !/^e\d{6,}$/.test(String(e.id))) return null;
    const name = String(e.name || "").trim().slice(0, 100);
    if (!name || (e.type !== "full" && e.type !== "partial") || !okDate(e.date)) return null;
    const seen = new Set(), pays = [];
    for (const p of Array.isArray(e.pays) ? e.pays.slice(0, 200) : []) {
      if (!okPay(p) || seen.has(p.id)) continue;
      seen.add(p.id); pays.push(withSub({ id: p.id, amt: p.amt, date: p.date }, p.sub));
    }
    if (!pays.length) return null;
    if (e.type === "full") pays.splice(1); // a full payment is a single payment
    return { id: e.id, name, note: String(e.note || "").trim().slice(0, 200), date: e.date, type: e.type, pays };
  };
  // other income (e.g. "Withdrawn from bank"): one amount per entry
  const cleanInc = (e) => {
    if (!e || typeof e !== "object" || !/^i\d{6,}$/.test(String(e.id))) return null;
    const name = String(e.name || "").trim().slice(0, 100);
    if (!name || !okDate(e.date) || typeof e.amt !== "number" || !Number.isFinite(e.amt) || e.amt <= 0 || e.amt > 1e9) return null;
    return { id: e.id, name, note: String(e.note || "").trim().slice(0, 200), date: e.date, amt: e.amt };
  };
  // one 2025 bill from a full backup (2025 stays read-only in the app; only a full restore can replace it)
  const cleanBase = (r) => {
    if (!r || typeof r !== "object" || !Number.isInteger(r.cn) || r.cn < 1 || r.cn > 9999) return null;
    const name = String(r.name || "").trim().slice(0, 200);
    if (!name || typeof r.amt !== "number" || !Number.isFinite(r.amt) || r.amt < 0 || r.amt > 1e9 || !["paid", "due", "na"].includes(r.st)) return null;
    return { cn: r.cn, name, addr: String(r.addr || "").trim().slice(0, 300), amt: r.amt, st: r.st, note: String(r.note || "").trim().slice(0, 300), book: String(r.book || "").trim().slice(0, 100) };
  };
  // bhog issued to a person who has no bill: just a name and how many boxes (at least 1)
  const cleanBhog = (e) => {
    if (!e || typeof e !== "object" || !/^b\d{6,}$/.test(String(e.id))) return null;
    const name = String(e.name || "").trim().slice(0, 100);
    if (!name || !okBoxes(e.boxes) || e.boxes < 1) return null;
    return { id: e.id, name, boxes: e.boxes };
  };
  const d = await load();
  // Replaces ALL 2026 data with a backup. Everything is re-validated; unknown or invalid parts are dropped.
  // full=false (2026-only restore): lists missing from an older backup keep the current data. full=true: missing lists become empty.
  const applyRestore = (src, full) => {
    if (!src || typeof src !== "object" || !src.rec || typeof src.rec !== "object" || Array.isArray(src.rec) || Object.keys(src.rec).length > 20000) return "bad backup";
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
    const sect = (name, clean, allowed) => {
      const v = src[name];
      if (Array.isArray(v)) { const ids = new Set(), out = []; if (allowed) for (const e of v.slice(0, 5000)) { const c = clean(e); if (c && !ids.has(c.id)) { ids.add(c.id); out.push(c); } } d[name] = out; }
      else if (full) d[name] = [];
    };
    sect("expenses", cleanExp, true);
    sect("bhogOnly", cleanBhog, !notReady()); // all of these are "issued", so the 9 Nov rule applies
    sect("income", cleanInc, true);
    return null;
  };

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
    const err = applyRestore(b.data, false); if (err) return json({ error: err }, 400);
  } else if (b.action === "restoreFull") {
    // FULL copy: the 2025 bills AND all 2026 data, so the whole site can be rebuilt on another Netlify site
    const src = b.data;
    if (!src || typeof src !== "object" || !Array.isArray(src.base2025) || src.base2025.length < 1 || src.base2025.length > 3000) return json({ error: "bad backup" }, 400);
    const seenCn = new Set(), base = [];
    for (const r of src.base2025) { const c = cleanBase(r); if (c && !seenCn.has(c.cn)) { seenCn.add(c.cn); base.push(c); } }
    if (!base.length) return json({ error: "bad backup" }, 400);
    const err = applyRestore(src.data2026, true); if (err) return json({ error: err }, 400);
    await store.setJSON(BASE_KEY, base); // (the 2026 part is saved just below, after everything checked out)
  } else if (b.action === "addBhogOnly") {
    const e = cleanBhog(b.bhog);
    if (!e) return json({ error: "bad bhog entry" }, 400);
    if (notReady()) return json({ error: "bhog_not_ready" }, 400);
    if (d.bhogOnly.length >= 5000 || d.bhogOnly.some((x) => x.id === e.id)) return json({ error: "bad bhog entry" }, 400);
    d.bhogOnly.push(e);
  } else if (b.action === "setBhogOnly") {
    const x = d.bhogOnly.find((z) => z.id === String(b.id || ""));
    if (!x) return json({ error: "unknown bhog entry" }, 400);
    if (!okBoxes(b.boxes) || b.boxes < 1) return json({ error: "bad boxes" }, 400);
    if (notReady()) return json({ error: "bhog_not_ready" }, 400);
    x.boxes = b.boxes;
  } else if (b.action === "delBhogOnly") {
    const id = String(b.id || "");
    if (!d.bhogOnly.some((x) => x.id === id)) return json({ error: "unknown bhog entry" }, 400);
    d.bhogOnly = d.bhogOnly.filter((x) => x.id !== id);
  } else if (b.action === "addIncome") {
    const e = cleanInc(b.income);
    if (!e || d.income.length >= 5000 || d.income.some((x) => x.id === e.id)) return json({ error: "bad income" }, 400);
    d.income.push(e);
  } else if (b.action === "delIncome") {
    const id = String(b.id || "");
    if (!d.income.some((x) => x.id === id)) return json({ error: "unknown income" }, 400);
    d.income = d.income.filter((x) => x.id !== id);
  } else if (b.action === "addExpense") {
    const e = cleanExp(b.expense);
    if (!e || d.expenses.length >= 5000 || d.expenses.some((x) => x.id === e.id)) return json({ error: "bad expense" }, 400);
    d.expenses.push(e);
  } else if (b.action === "addPayment") {
    const e = d.expenses.find((x) => x.id === String(b.id || ""));
    if (!e) return json({ error: "unknown expense" }, 400);
    if (e.type !== "partial") return json({ error: "this expense is a full payment" }, 400);
    if (!okPay(b.pay) || e.pays.length >= 200 || e.pays.some((p) => p.id === b.pay.id)) return json({ error: "bad payment" }, 400);
    e.pays.push(withSub({ id: b.pay.id, amt: b.pay.amt, date: b.pay.date }, b.pay.sub));
  } else if (b.action === "delPayment") {
    const e = d.expenses.find((x) => x.id === String(b.id || ""));
    if (!e || !e.pays.some((p) => p.id === b.pid)) return json({ error: "unknown payment" }, 400);
    if (e.pays.length <= 1) return json({ error: "delete the whole expense instead" }, 400);
    e.pays = e.pays.filter((p) => p.id !== b.pid);
  } else if (b.action === "delExpense") {
    const id = String(b.id || "");
    if (!d.expenses.some((x) => x.id === id)) return json({ error: "unknown expense" }, 400);
    d.expenses = d.expenses.filter((x) => x.id !== id);
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
