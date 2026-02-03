import type { ChannelPlugin } from "openclaw/plugin-sdk";
import type { MCConvexAccount } from "./types.js";
import { resolveMCConvexAccount, listMCConvexAccountIds, isAccountConfigured } from "./config.js";
import { sendMessage } from "./outbound.js";
import { startMonitor } from "./monitor.js";
import { createReplyPrefixContext } from "openclaw/plugin-sdk";

// Dynamically import internal openclaw modules
const loadModules = async () => {
  const [dispatchMod, contextMod, dispatcherMod, bindingsMod, identityMod] = await Promise.all([
    import("/opt/openclaw/dist/auto-reply/dispatch.js"),
    import("/opt/openclaw/dist/auto-reply/reply/inbound-context.js"),
    import("/opt/openclaw/dist/auto-reply/reply/reply-dispatcher.js"),
    import("/opt/openclaw/dist/routing/bindings.js"),
    import("/opt/openclaw/dist/agents/identity.js"),
  ]);
  return {
    dispatchInboundMessageWithDispatcher: dispatchMod.dispatchInboundMessageWithDispatcher,
    finalizeInboundContext: contextMod.finalizeInboundContext,
    createReplyDispatcher: dispatcherMod.createReplyDispatcher,
    listBindings: bindingsMod.listBindings,
    resolveHumanDelayConfig: identityMod.resolveHumanDelayConfig,
  };
};

// Helper to find agent ID from bindings
function findAgentIdForAccount(bindings: any[], channel: string, accountId: string): string | null {
  const binding = bindings.find(b => 
    b.match?.channel === channel && b.match?.accountId === accountId
  );
  return binding?.agentId ?? null;
}

export const missionControlConvexPlugin: ChannelPlugin<MCConvexAccount> = {
  id: "missioncontrol-convex",
  meta: {
    id: "missioncontrol-convex",
    label: "Mission Control (Convex)",
    selectionLabel: "Mission Control Convex",
    docsPath: "channels/missioncontrol-convex",
    blurb: "Chat with dashboard users on Mission Control (Convex Edition) with realtime support",
    order: 51,
    aliases: ["mc-convex", "mcc"],
  },
  capabilities: {
    chatTypes: ["direct"],
    reactions: false,
    threads: true,
    media: false,
    reply: true,
  },
  reload: { configPrefixes: ["channels.missioncontrol-convex"] },
  config: {
    listAccountIds: (cfg) => listMCConvexAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveMCConvexAccount(cfg, accountId),
    defaultAccountId: () => "default",
    isConfigured: (account) => isAccountConfigured(account),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name || account.accountId,
      enabled: account.enabled,
      configured: isAccountConfigured(account),
    }),
  },
  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 10000,
    sendText: async ({ to, text, accountId, cfg }) => {
      const account = resolveMCConvexAccount(cfg, accountId);
      const result = await sendMessage({
        conversationId: to,
        content: text,
        messageType: "text",
        account,
      });
      return result;
    },
  },
  status: {
    defaultRuntime: {
      accountId: "default",
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: isAccountConfigured(account),
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      const cfg = ctx.cfg;
      ctx.log?.info(`[${account.accountId}] Starting Mission Control Convex monitor`);

      // Load required modules
      const mods = await loadModules();
      
      // Get all bindings and find the agent for this account
      const bindings = mods.listBindings(cfg);
      const agentId = findAgentIdForAccount(bindings, "missioncontrol-convex", account.accountId);
      
      if (!agentId) {
        throw new Error(`No binding found for missioncontrol-convex account: ${account.accountId}. Check your bindings config.`);
      }

      console.log(`[missioncontrol-convex] Resolved agent binding: account=${account.accountId} -> agentId=${agentId}`);

      const handle = await startMonitor({
        account,
        onMessage: async (msg) => {
          console.log(`[missioncontrol-convex] Processing message for ${account.accountId} (agent: ${agentId}): ${msg.content.substring(0, 50)}`);

          try {
            const prefixContext = createReplyPrefixContext({ cfg, agentId });
            
            // Build the session key
            const sessionKey = `agent:${agentId}:missioncontrol-convex:${msg.conversationId}`;
            console.log(`[missioncontrol-convex] Using sessionKey: ${sessionKey}`);

            // Build the inbound context
            const ctxPayload = mods.finalizeInboundContext({
              Body: msg.content,
              RawBody: msg.content,
              CommandBody: msg.content,
              From: `missioncontrol-convex:${msg.senderId}`,
              To: `missioncontrol-convex:${account.accountId}`,
              Surface: "missioncontrol-convex",
              Provider: "missioncontrol-convex",
              OriginatingChannel: "missioncontrol-convex",
              OriginatingTo: `missioncontrol-convex:${account.accountId}`,
              ChatType: "direct",
              MessageId: msg.messageId,
              ThreadId: msg.conversationId,
              ConversationId: msg.conversationId,
              SessionKey: sessionKey,
              AccountId: account.accountId,
              SenderId: msg.senderId,
              SenderType: msg.senderType,
              SenderName: msg.senderName,
              Timestamp: msg.timestamp,
              CommandAuthorized: true,
            });

            // Dispatch the message
            await mods.dispatchInboundMessageWithDispatcher({
              ctx: ctxPayload,
              cfg,
              dispatcherOptions: {
                responsePrefix: prefixContext.responsePrefix,
                responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
                humanDelay: mods.resolveHumanDelayConfig(cfg, agentId),
                deliver: async (payload: { text: string }) => {
                  console.log(`[missioncontrol-convex] Delivering reply to ${msg.conversationId}: ${payload.text.substring(0, 100)}...`);
                  await sendMessage({
                    conversationId: msg.conversationId,
                    content: payload.text,
                    messageType: "text",
                    account,
                  });
                  console.log(`[missioncontrol-convex] Reply delivered successfully`);
                },
                onError: (err: Error, info: { kind: string }) => {
                  console.error(`[missioncontrol-convex] Reply ${info.kind} failed: ${String(err)}`);
                },
              },
              replyOptions: {
                onModelSelected: prefixContext.onModelSelected,
              },
            });

            console.log(`[missioncontrol-convex] Message dispatched successfully`);
          } catch (err) {
            console.error(`[missioncontrol-convex] Error dispatching message: ${err}`);
          }
        },
        onError: (err) => {
          ctx.log?.error(`[${account.accountId}] Monitor error: ${err.message}`);
        },
        abortSignal: ctx.abortSignal,
      });

      return handle;
    },
  },
};
