import { serve } from "@hono/node-server";
import { Hono } from "hono";
import {
  createTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
} from "./db.js";

const PORT = Number(process.env.PORT || 5100);
const app = new Hono();

app.get("/healthz", (c) => c.json({ ok: true }));

app.get("/todos", (c) => c.json(listTodos()));

app.post("/todos", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return c.json({ error: "title is required" }, 400);
  return c.json(createTodo(title), 201);
});

app.post("/todos/:id/toggle", (c) => {
  const id = Number(c.req.param("id"));
  const todo = toggleTodo(id);
  if (!todo) return c.json({ error: "not found" }, 404);
  return c.json(todo);
});

app.delete("/todos/:id", (c) => {
  const id = Number(c.req.param("id"));
  if (!deleteTodo(id)) return c.json({ error: "not found" }, 404);
  return c.body(null, 204);
});

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`todo-api listening on 0.0.0.0:${info.port}`);
});
