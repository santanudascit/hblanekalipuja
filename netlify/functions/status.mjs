import { getStore } from "@netlify/blobs";

// GET  /api/status          -> { "<billNo>": { status: "paid"|"due", ts } }
// POST /api/status          -> body { cn, status, pin }  (pin required only if ADMIN_PIN env var is set)
export default async (req) => {
  const store = getStore("kalipuja-2025");
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

  if (req.method === "GET") return json((await store.get("overrides", { type: "json" })) || {});

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    const pin = process.env.ADMIN_PIN;
    if (pin && b.pin !== pin) return json({ error: "unauthorized" }, 401);
    if (!Number.isInteger(b.cn) || !["paid", "due"].includes(b.status)) return json({ error: "bad input" }, 400);
    const cur = (await store.get("overrides", { type: "json" })) || {};
    cur[b.cn] = { status: b.status, ts: Date.now() };
    await store.setJSON("overrides", cur);
    return json(cur);
  }
  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/status" };
