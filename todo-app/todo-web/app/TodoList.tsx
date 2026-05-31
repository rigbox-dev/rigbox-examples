"use client";

import { useState } from "react";
import type { Todo } from "./lib/api";

export default function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sort = (list: Todo[]) =>
    [...list].sort((a, b) =>
      a.done === b.done ? b.id - a.id : a.done ? 1 : -1,
    );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      if (!res.ok) throw new Error("could not add");
      const created: Todo = await res.json();
      setTodos((prev) => sort([created, ...prev]));
      setTitle("");
    } catch {
      setError("Could not reach todo-api.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: number) {
    const res = await fetch(`/api/todos/${id}/toggle`, { method: "POST" });
    if (!res.ok) return;
    const updated: Todo = await res.json();
    setTodos((prev) => sort(prev.map((t) => (t.id === id ? updated : t))));
  }

  async function remove(id: number) {
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
    if (res.status !== 204) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  const remaining = todos.filter((t) => !t.done).length;

  return (
    <div className="rb-stack">
      <form className="todo-add" onSubmit={add}>
        <input
          className="rb-input"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="New task"
        />
        <button className="rb-btn" type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add"}
        </button>
      </form>

      {error && (
        <span className="rb-pill rb-pill-danger">{error}</span>
      )}

      <div className="rb-row" style={{ justifyContent: "space-between" }}>
        <span className="rb-pill">{remaining} open</span>
        <span className="rb-muted">{todos.length} total</span>
      </div>

      {todos.length === 0 ? (
        <div className="todo-empty rb-muted">Nothing yet — add your first task.</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {todos.map((t) => (
            <li key={t.id} className={`todo-item ${t.done ? "is-done" : ""}`}>
              <input
                className="todo-check"
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                aria-label={t.done ? "Mark not done" : "Mark done"}
              />
              <span className="todo-title">{t.title}</span>
              <button
                className="rb-btn rb-btn-ghost"
                onClick={() => remove(t.id)}
                aria-label="Delete task"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
