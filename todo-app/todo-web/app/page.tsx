import { API_URL, fetchTodos, type Todo } from "./lib/api";
import TodoList from "./TodoList";

export const dynamic = "force-dynamic";

export default async function Home() {
  let todos: Todo[] = [];
  let apiOk = true;
  try {
    todos = await fetchTodos();
  } catch {
    apiOk = false;
  }

  return (
    <>
      <header className="rb-header">
        <span className="rb-title">Todo</span>
        <span className="rb-badge">Rigbox example</span>
      </header>

      <main className="rb-container">
        <div className="rb-card rb-stack">
          <div className="rb-row" style={{ justifyContent: "space-between" }}>
            <h1 style={{ margin: 0 }}>Things to do</h1>
            <span className={`rb-pill ${apiOk ? "rb-pill-ok" : "rb-pill-danger"}`}>
              {apiOk ? "todo-api connected" : "todo-api unreachable"}
            </span>
          </div>

          <p className="rb-muted" style={{ margin: 0 }}>
            This page is served by <strong>todo-web</strong> (Next.js, public). It
            reaches a <strong>private</strong> sibling, <strong>todo-api</strong>,
            server-side over loopback — the browser only ever talks same-origin.
          </p>

          <TodoList initialTodos={todos} />

          <p className="rb-hint loopback-note">
            Loopback: <span className="rb-mono">RIGBOX_TODO_API_URL={API_URL}</span>{" "}
            — injected by <span className="rb-mono">dependsOn: [todo-api]</span>.
            The API has no public subdomain.
          </p>
        </div>
      </main>

      <footer className="rb-footer">
        A Rigbox example · built with <em>Next.js + Hono + SQLite</em> ·{" "}
        <a href="https://rigbox.dev">rigbox.dev</a>
      </footer>
    </>
  );
}
