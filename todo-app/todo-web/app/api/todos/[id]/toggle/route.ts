import { API_URL } from "@/app/lib/api";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/todos/${encodeURIComponent(id)}/toggle`, {
    method: "POST",
  });
  const out = await res.text();
  return new Response(out, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
