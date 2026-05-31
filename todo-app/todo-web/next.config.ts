import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only env: the loopback URL of the private todo-api sibling.
  // Injected by Rigbox via dependsOn: [todo-api]. Never exposed to the browser.
};

export default nextConfig;
