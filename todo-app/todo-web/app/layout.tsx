import type { Metadata } from "next";
import "./tokens.css";
import "./app.css";

export const metadata: Metadata = {
  title: "Todo · Rigbox example",
  description: "A to-do list SPA backed by a private API over loopback.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
