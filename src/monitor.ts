import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { MCConvexAccount, MCConvexMessage, MCConvexConversation } from "./types.js";
import { normalizeMessage, type NormalizedMCConvexMessage } from "./normalize.js";
import { getConversations, getMessages } from "./outbound.js";

export interface MonitorOptions {
  account: MCConvexAccount;
  onMessage: (msg: NormalizedMCConvexMessage) => void;
  onError?: (error: Error) => void;
  abortSignal?: AbortSignal;
}

export interface MonitorHandle {
  stop: () => Promise<void>;
}

export async function startMonitor(options: MonitorOptions): Promise<MonitorHandle> {
  const { account, onMessage, onError, abortSignal } = options;

  const processedMessageIds = new Set<string>();
  const myConversations = new Map<string, MCConvexConversation>();
  const initialSyncComplete = new Set<string>();
  const connectionTimestamp = Date.now();
  const GRACE_PERIOD_MS = 20000; // 20 seconds - respond to messages sent within this window before connection

  let isRunning = true;
  let convexClient: ConvexClient | null = null;
  let unsubscribes: Array<() => void> = [];
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let usePollingFallback = false;
  let subscriptionsFailed = 0;

  console.log("[missioncontrol-convex] Starting monitor for agent " + account.agentId);
  console.log("[missioncontrol-convex] Connection timestamp: " + connectionTimestamp);
  console.log("[missioncontrol-convex] Convex URL: " + account.convexUrl);
  console.log("[missioncontrol-convex] API URL: " + account.apiUrl);

  async function refreshConversations(): Promise<void> {
    try {
      const conversations = await getConversations(account);
      
      for (const conv of conversations) {
        const isTarget = conv.targetAgentId === account.agentId;
        const isInitiator = conv.initiatorId === account.agentId;
        
        if (isTarget || isInitiator) {
          const isNew = myConversations.has(conv._id) === false;
          myConversations.set(conv._id, conv);
          
          if (isNew && convexClient && usePollingFallback === false) {
            subscribeToConversation(conv._id);
          }
        }
      }
      
      console.log("[missioncontrol-convex] Tracking " + myConversations.size + " conversations");
    } catch (err) {
      console.error("[missioncontrol-convex] Failed to refresh conversations: " + err);
      if (err instanceof Error) {
        onError?.(err);
      } else {
        onError?.(new Error(String(err)));
      }
    }
  }

  function switchToPolling(): void {
    if (usePollingFallback) return;
    
    console.log("[missioncontrol-convex] Switching to polling mode");
    usePollingFallback = true;
    
    for (const unsub of unsubscribes) {
      try { unsub(); } catch {}
    }
    unsubscribes = [];
    
    if (convexClient) {
      try { convexClient.close(); } catch {}
      convexClient = null;
    }
    
    pollMessages();
  }

  function subscribeToConversation(conversationId: string): void {
    if (convexClient === null || usePollingFallback) return;

    try {
      console.log("[missioncontrol-convex] Subscribing to conversation: " + conversationId);
      
      const messagesQuery = makeFunctionReference<"query">("chat/queries:getMessages");
      
      const unsubscribe = convexClient.onUpdate(
        messagesQuery,
        { conversationId },
        (messages: MCConvexMessage[]) => {
          if (isRunning === false) return;

          const isInitialSync = !initialSyncComplete.has(conversationId);

          for (const msg of messages) {
            if (processedMessageIds.has(msg._id)) continue;

            if (msg.senderId === account.agentId) {
              processedMessageIds.add(msg._id);
              continue;
            }

            // Check if this is a historical message (sent before we connected, outside grace period)
            const msgTimestamp = msg._creationTime || 0;
            const messageAge = connectionTimestamp - msgTimestamp;
            const isHistorical = msgTimestamp < connectionTimestamp && messageAge > GRACE_PERIOD_MS;

            // During initial sync, skip only truly old messages (outside grace period)
            if (isHistorical && isInitialSync) {
              console.log("[missioncontrol-convex] [CONTEXT] Historical message from " + msg.senderId + " (age: " + Math.round(messageAge / 1000) + "s, skipping): " + msg.content.substring(0, 50) + "...");
              processedMessageIds.add(msg._id);
              continue;
            }

            console.log("[missioncontrol-convex] [REALTIME] New message from " + msg.senderId + " (age: " + Math.round(messageAge / 1000) + "s): " + msg.content.substring(0, 50) + "...");
            processedMessageIds.add(msg._id);

            const normalized = normalizeMessage(msg, account.accountId);
            onMessage(normalized);
          }

          // Mark initial sync as complete for this conversation
          if (isInitialSync) {
            initialSyncComplete.add(conversationId);
            console.log("[missioncontrol-convex] Initial sync complete for conversation: " + conversationId);
          }
        },
        (error: Error) => {
          console.error("[missioncontrol-convex] Subscription error for " + conversationId + ": " + error.message);
          subscriptionsFailed++;
          if (subscriptionsFailed >= myConversations.size) {
            switchToPolling();
          }
        }
      );
      
      unsubscribes.push(unsubscribe);
      console.log("[missioncontrol-convex] Subscribed to conversation: " + conversationId);
    } catch (err) {
      console.error("[missioncontrol-convex] Failed to subscribe to " + conversationId + ": " + err);
      subscriptionsFailed++;
      if (subscriptionsFailed >= myConversations.size) {
        switchToPolling();
      }
    }
  }

  async function tryRealtimeConnection(): Promise<boolean> {
    try {
      console.log("[missioncontrol-convex] Attempting realtime connection to " + account.convexUrl + "...");
      
      convexClient = new ConvexClient(account.convexUrl);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("[missioncontrol-convex] Realtime connection established!");
      return true;
    } catch (err) {
      console.warn("[missioncontrol-convex] Realtime connection failed: " + err);
      console.log("[missioncontrol-convex] Falling back to polling mode");
      convexClient = null;
      return false;
    }
  }

  async function pollMessages(): Promise<void> {
    if (isRunning === false || usePollingFallback === false) return;

    try {
      await refreshConversations();

      for (const [convId] of myConversations) {
        try {
          const messages = await getMessages(account, convId);
          const isInitialSync = !initialSyncComplete.has(convId);

          for (const msg of messages) {
            if (processedMessageIds.has(msg._id)) continue;

            if (msg.senderId === account.agentId) {
              processedMessageIds.add(msg._id);
              continue;
            }

            // Check if this is a historical message (sent before we connected, outside grace period)
            const msgTimestamp = msg._creationTime || 0;
            const messageAge = connectionTimestamp - msgTimestamp;
            const isHistorical = msgTimestamp < connectionTimestamp && messageAge > GRACE_PERIOD_MS;

            // During initial sync, skip only truly old messages (outside grace period)
            if (isHistorical && isInitialSync) {
              console.log("[missioncontrol-convex] [CONTEXT] Historical message from " + msg.senderId + " (age: " + Math.round(messageAge / 1000) + "s, skipping): " + msg.content.substring(0, 50) + "...");
              processedMessageIds.add(msg._id);
              continue;
            }

            console.log("[missioncontrol-convex] [POLL] New message from " + msg.senderId + " (age: " + Math.round(messageAge / 1000) + "s): " + msg.content.substring(0, 50) + "...");
            processedMessageIds.add(msg._id);

            const normalized = normalizeMessage(msg, account.accountId);
            onMessage(normalized);
          }

          // Mark initial sync as complete for this conversation
          if (isInitialSync) {
            initialSyncComplete.add(convId);
            console.log("[missioncontrol-convex] Initial sync complete for conversation: " + convId);
          }
        } catch (err) {
          console.error("[missioncontrol-convex] Error polling conversation " + convId + ": " + err);
        }
      }
    } catch (err) {
      console.error("[missioncontrol-convex] Poll error: " + err);
      if (err instanceof Error) {
        onError?.(err);
      } else {
        onError?.(new Error(String(err)));
      }
    }

    if (isRunning && usePollingFallback) {
      pollTimeout = setTimeout(pollMessages, account.pollIntervalMs || 5000);
    }
  }

  async function conversationWatcher(): Promise<void> {
    if (isRunning === false) return;
    
    await refreshConversations();
    
    if (isRunning && usePollingFallback === false) {
      setTimeout(conversationWatcher, 30000);
    }
  }

  if (abortSignal) {
    abortSignal.addEventListener("abort", async () => {
      await cleanup();
    });
  }

  async function cleanup(): Promise<void> {
    console.log("[missioncontrol-convex] Stopping monitor for agent " + account.agentId);
    isRunning = false;
    
    for (const unsub of unsubscribes) {
      try { unsub(); } catch {}
    }
    unsubscribes = [];
    
    if (convexClient) {
      try { await convexClient.close(); } catch {}
      convexClient = null;
    }
    
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
  }

  await refreshConversations();
  
  const realtimeOk = await tryRealtimeConnection();
  
  if (realtimeOk && convexClient) {
    for (const convId of myConversations.keys()) {
      subscribeToConversation(convId);
    }
    conversationWatcher();
  } else {
    usePollingFallback = true;
    pollMessages();
  }

  return {
    stop: cleanup,
  };
}
