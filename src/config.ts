import type { MCConvexAccount, MCConvexConfigSection } from "./types.js";

const DEFAULT_ACCOUNT_ID = "default";
const DEFAULT_API_URL = "https://next-bullfrog-254.convex.site/api/v1";
const DEFAULT_CONVEX_URL = "https://next-bullfrog-254.convex.cloud";
const DEFAULT_POLL_INTERVAL_MS = 5000; // 5 seconds fallback

export function resolveMCConvexAccount(cfg: any, accountId?: string): MCConvexAccount {
  const mc = cfg.channels?.["missioncontrol-convex"] as MCConvexConfigSection | undefined;
  const resolvedAccountId = accountId || DEFAULT_ACCOUNT_ID;

  const accountConfig = mc?.accounts?.[resolvedAccountId];

  const apiKey = accountConfig?.apiKey
    || mc?.apiKey
    || process.env.MISSION_CONTROL_CONVEX_API_KEY
    || "";

  const agentId = accountConfig?.agentId
    || mc?.agentId
    || process.env.MISSION_CONTROL_CONVEX_AGENT_ID
    || "";

  const apiUrl = accountConfig?.apiUrl
    || mc?.apiUrl
    || process.env.MISSION_CONTROL_CONVEX_API_URL
    || DEFAULT_API_URL;

  const convexUrl = accountConfig?.convexUrl
    || mc?.convexUrl
    || process.env.MISSION_CONTROL_CONVEX_URL
    || DEFAULT_CONVEX_URL;

  const pollIntervalMs = accountConfig?.pollIntervalMs
    || mc?.pollIntervalMs
    || DEFAULT_POLL_INTERVAL_MS;

  const enabled = accountConfig?.enabled ?? mc?.enabled ?? true;

  return {
    accountId: resolvedAccountId,
    apiKey,
    agentId,
    apiUrl,
    convexUrl,
    enabled,
    name: accountConfig?.name,
    pollIntervalMs,
  };
}

export function listMCConvexAccountIds(cfg: any): string[] {
  const mc = cfg.channels?.["missioncontrol-convex"] as MCConvexConfigSection | undefined;
  if (!mc) return [];

  const accounts = mc.accounts ? Object.keys(mc.accounts) : [];

  if (mc.apiKey || process.env.MISSION_CONTROL_CONVEX_API_KEY) {
    if (!accounts.includes(DEFAULT_ACCOUNT_ID)) {
      accounts.unshift(DEFAULT_ACCOUNT_ID);
    }
  }

  return accounts;
}

export function isAccountConfigured(account: MCConvexAccount): boolean {
  return Boolean(account.apiKey && account.agentId);
}
