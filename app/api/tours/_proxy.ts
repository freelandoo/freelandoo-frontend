import { NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/backend";

const BACKEND = getBackendApiUrl();

function authHeader(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization");
}

export async function proxyTours(request: Request, path: string) {
  const authorization = authHeader(request);
  if (!authorization) {
    return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });
  }
  const init: RequestInit = {
    method: request.method,
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (request.method !== "GET") init.body = await request.text();
  const backendResponse = await fetch(`${BACKEND}${path}`, init);
  const text = await backendResponse.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || "Erro de proxy" };
  }
  return NextResponse.json(data, { status: backendResponse.status });
}
