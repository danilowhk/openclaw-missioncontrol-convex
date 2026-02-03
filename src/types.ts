/**
 * Mission Control Convex Types
 */

export interface MCConvexAccount {
  accountId: string;
  apiKey: string;
  agentId: string;
  apiUrl: string;          // HTTP API: https://xxx.convex.site/api/v1
  convexUrl: string;       // Convex Cloud: https://xxx.convex.cloud
  enabled: boolean;
  name?: string;
  pollIntervalMs?: number; // Fallback polling interval if realtime fails
}

export interface MCConvexConfigSection {
  enabled?: boolean;
  apiUrl?: string;
  convexUrl?: string;
  apiKey?: string;
  agentId?: string;
  pollIntervalMs?: number;
  accounts?: Record<string, Partial<MCConvexAccount>>;
}

export interface MCConvexMessage {
  _id: string;
  _creationTime: number;
  conversationId: string;
  content: string;
  messageType: "text" | "code" | "markdown" | "system";
  senderId: string;
  senderType: "agent" | "user";
  status: string;
  sender?: {
    id: string;
    name: string;
  };
}

export interface MCConvexConversation {
  _id: string;
  _creationTime: number;
  initiatorId: string;
  targetAgentId: string;
  title?: string;
  status: string;
  lastMessageAt: number;
}

export interface MCConvexApiResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: T | boolean | string | undefined;
}
