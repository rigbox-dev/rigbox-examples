// Server-side only. The todo-api sibling is PRIVATE (no public subdomain).
// Rigbox injects RIGBOX_TODO_API_URL=http://127.0.0.1:5100 because todo-web
// declares dependsOn: [todo-api]. The browser never sees this URL — all calls
// happen here, server-side, over loopback.
export const API_URL = process.env.RIGBOX_TODO_API_URL || "http://127.0.0.1:5100";

export type Todo = {
  id: number;
  title: string;
  done: boolean;
  created_at: string;
};

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch(`${API_URL}/todos`, { cache: "no-store" });
  if (!res.ok) throw new Error(`todo-api ${res.status}`);
  return res.json();
}
