import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env.DATA_DIR || "/home/developer/data";
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, "todos.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export type Todo = {
  id: number;
  title: string;
  done: boolean;
  created_at: string;
};

type Row = { id: number; title: string; done: number; created_at: string };
const toTodo = (r: Row): Todo => ({ ...r, done: r.done === 1 });

const LIST_LIMIT = Math.max(1, Number(process.env.LIST_LIMIT) || 50);

const listStmt = db.prepare(
  "SELECT * FROM todos ORDER BY done ASC, id DESC LIMIT ?",
);
const insertStmt = db.prepare("INSERT INTO todos (title) VALUES (?)");
const getStmt = db.prepare("SELECT * FROM todos WHERE id = ?");
const toggleStmt = db.prepare("UPDATE todos SET done = NOT done WHERE id = ?");
const deleteStmt = db.prepare("DELETE FROM todos WHERE id = ?");

export const listTodos = (): Todo[] =>
  (listStmt.all(LIST_LIMIT) as Row[]).map(toTodo);

export const createTodo = (title: string): Todo => {
  const info = insertStmt.run(title);
  return toTodo(getStmt.get(info.lastInsertRowid) as Row);
};

export const toggleTodo = (id: number): Todo | null => {
  const changed = toggleStmt.run(id).changes;
  if (changed === 0) return null;
  return toTodo(getStmt.get(id) as Row);
};

export const deleteTodo = (id: number): boolean =>
  deleteStmt.run(id).changes > 0;
