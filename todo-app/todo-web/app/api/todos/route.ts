import { API_URL } from "@/app/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(`${API_URL}/todos`, { cache: "no-store" });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(`${API_URL}/todos`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const out = await res.text();
  return new Response(out, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
