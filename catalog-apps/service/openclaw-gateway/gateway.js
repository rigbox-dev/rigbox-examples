// Synthesize OpenClaw's runtime config from environment.
//
// Resolves the model the gateway should serve:
//   - Managed mode (AI_PROXY_URL set, no per-provider key) → points OpenClaw at
//     the Rigbox /v1 proxy via a custom `rigbox-openrouter` provider entry,
//     and writes an auth-profile that carries the `managed-by-rigbox`
//     placeholder key.
//   - BYO mode (e.g. ANTHROPIC_API_KEY / GEMINI_API_KEY set) → leaves OpenClaw's
//     default provider list intact and writes a profile with the real key.
//
// Also wires the Control UI allowed-origins list to the per-VM rigbox subdomain
// so the browser UI can reach the gateway WebSocket through the public
// hostname. The unit's Environment= renders {SUBDOMAIN} into
// OPENCLAW_PUBLIC_ORIGIN at boot, which this script appends.

const fs = require("fs");
const path = require("path");

const home = "/home/developer";
const configDir = path.join(home, ".openclaw");
const provider = (process.env.OPENCLAW_PROVIDER || "anthropic").trim() || "anthropic";
const configuredModel = (process.env.OPENCLAW_DEFAULT_MODEL || "").trim();
const byokModels = {
  google: "gemini-2.5-pro",
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
};
const keyVars = {
  google: "GEMINI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};
const altKeyVars = { google: "GOOGLE_API_KEY" };
const env = {};
const keyVar = keyVars[provider] || keyVars.anthropic;
const apiKey = process.env[keyVar] || process.env[altKeyVars[provider]] || "";
if (apiKey) env[keyVar] = apiKey;
const proxy = (process.env.AI_PROXY_URL || process.env.RIGBOX_AI_PROXY_URL || "").replace(/\/+$/, "");
const proxyV1 = proxy ? `${proxy}/v1` : "";
const managed = Boolean(proxy && !apiKey);
if (managed) {
  env.OPENAI_BASE_URL = proxyV1;
  env.OPENAI_API_BASE_URL = proxyV1;
  env.OPENAI_API_KEY = "managed-by-rigbox";
}

const customProvider = "rigbox-openrouter";

function byokModel(providerName, configured, fallback) {
  if (!configured) return fallback;
  const prefix = `${providerName}/`;
  return configured.startsWith(prefix) ? configured.slice(prefix.length) : configured;
}

const modelName = managed
  ? (configuredModel || "rigbox/default")
  : byokModel(provider, configuredModel, byokModels[provider] || byokModels.anthropic);
const modelProvider = managed ? customProvider : provider;

function displayName(modelId) {
  return modelId
    .split(/[/-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function authProfiles(providerName, key) {
  const profileId = `${providerName}:default`;
  return {
    version: 1,
    profiles: { [profileId]: { type: "api_key", provider: providerName, key } },
    lastGood: { [providerName]: profileId },
  };
}

// Trust loopback + the host bridge subnet so the gateway honours
// X-Forwarded-* from the upstream Caddy hop.
const trustedProxies = ["127.0.0.1", "::1", "172.16.0.0/12"];
for (const cidr of (process.env.OPENCLAW_TRUSTED_PROXIES || "").split(",").map((s) => s.trim()).filter(Boolean)) {
  if (!trustedProxies.includes(cidr)) trustedProxies.push(cidr);
}

// Control UI origin allowlist: loopback URLs + the per-VM rigbox subdomain
// the systemd unit renders into OPENCLAW_PUBLIC_ORIGIN.
const allowedOrigins = ["http://localhost:18789", "http://127.0.0.1:18789"];
const extraOrigins = (process.env.OPENCLAW_ALLOWED_ORIGINS || process.env.OPENCLAW_PUBLIC_ORIGIN || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
for (const o of extraOrigins) {
  if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
}

const config = {
  env,
  agents: {
    defaults: {
      // OpenClaw v2026.4.29+ expects "provider/model" here and rejects the
      // legacy `models.default = { provider, model }` shape.
      model: `${modelProvider}/${modelName}`,
      systemPromptOverride: process.env.OPENCLAW_SYSTEM_PROMPT || "You are a helpful AI assistant.",
    },
  },
  ...(managed
    ? {
        models: {
          mode: "replace",
          providers: {
            [customProvider]: {
              baseUrl: proxyV1,
              apiKey: "managed-by-rigbox",
              api: "openai-completions",
              models: [
                {
                  id: modelName,
                  name: displayName(modelName),
                  reasoning: false,
                  input: ["text"],
                  contextWindow: 1048576,
                  maxTokens: 65536,
                },
              ],
            },
          },
        },
      }
    : {}),
  gateway: {
    port: 18789,
    bind: "lan",
    auth: { token: process.env.OPENCLAW_GATEWAY_TOKEN || "" },
    trustedProxies,
    controlUi: {
      allowedOrigins,
      // The rigbox subdomain layer + Tailscale + TLS gate inbound traffic.
      // Device pairing isn't workable for ephemeral VMs, so token auth alone
      // protects the Control UI.
      dangerouslyDisableDeviceAuth: true,
    },
  },
  tools: { web: { fetch: { enabled: true } } },
};

if (process.env.TELEGRAM_BOT_TOKEN) {
  config.channels = { telegram: { enabled: true, botToken: process.env.TELEGRAM_BOT_TOKEN } };
}

fs.mkdirSync(configDir, { recursive: true });
fs.writeFileSync(path.join(configDir, "openclaw.json"), JSON.stringify(config, null, 2));

if (managed || apiKey) {
  const authDir = path.join(configDir, "agents/main/agent");
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(
    path.join(authDir, "auth-profiles.json"),
    JSON.stringify(authProfiles(modelProvider, managed ? "managed-by-rigbox" : apiKey), null, 2),
  );
}
