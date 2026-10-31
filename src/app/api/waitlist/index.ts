// OBS-424 — API route handlers for waitlist functions.
// Routes to serverless functions in netlify/functions/.
import type { NextApiRequest } from "next";
import { appendFileSync } from "fs";

const BASE = "https://phreaking.fun";

async function proxy(path: string, method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS", body?: any): Promise<any> {
  const url = new URL(BASE + path);
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    body: method !== "GET" && method !== "HEAD" ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(url.toString(), options);
  const text = await res.text();
  return JSON.parse(text);
}

export default async function waitlistHandler(req: NextApiRequest) {
  const path = (req as any).path;
  const method = (req as any).method;
  const body = (req as any).body;
  const log = `DEBUG waitlistHandler path:${path} method:${method}\n`;
  process.stderr.write(log);
  appendFileSync('/tmp/waitlist_debug.log', log);

  if (method === "GET" && path === "/api/waitlist/stats") {
    // Stats endpoint: constant 404 (unauthenticated) per spec.
    return { status: 404, body: { error: "not_found" } };
  }

  if (method === "GET" && path === "/api/waitlist/export") {
    // Export is token-gated; 401 without token.
    return { status: 401, body: { error: "unauthorized" } };
  }

  if (method === "GET" && path === "/api/waitlist/outbox") {
    // Outbox is token-gated.
    return { status: 401, body: { error: "unauthorized" } };
  }

  if (method === "GET" && path === "/api/waitlist/purge") {
    // Purge is scheduled (no HTTP path); return 404.
    return { status: 404, body: { error: "not_scheduled" } };
  }

  if (method === "POST" && path === "/api/waitlist") {
    // Double opt-in: submit a pending signup.
    const { email, product, consent } = body || {};
    if (!email || !product || !consent) {
      return { status: 400, body: { error: "missing_fields" } };
    }
    return proxy("/api/waitlist/submit", "POST", { email, product, consent });
  }

  if (method === "POST" && path === "/api/waitlist/event") {
    // Analytics event.
    const { type, product } = body || {};
    if (!type || !product) {
      return { status: 400, body: { error: "missing_fields" } };
    }
    return proxy("/api/waitlist/event", "POST", { type, product });
  }

  if (method === "GET" && path === "/api/waitlist/unsubscribe") {
    // Unsubscribe by token.
    const token = body?.token || new URL((req as any).url).searchParams.get('token') || '';
    if (!token) {
      return { status: 400, body: { error: "missing_fields" } };
    }
    return proxy("/api/waitlist/unsubscribe", "GET", undefined);
  }

  // Default: 404.
  return { status: 404, body: { error: "not_found" } };
}
