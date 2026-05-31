import { API_URL } from "@/app/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${API_URL}/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return new Response(null, { status: res.status });
}
