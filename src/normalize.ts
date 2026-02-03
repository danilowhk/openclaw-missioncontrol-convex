import type { MCConvexMessage } from "./types.js";

export interface NormalizedMCConvexMessage {
  messageId: string;
  conversationId: string;
  content: string;
  senderId: string;
  senderType: "agent" | "user";
  senderName?: string;
  timestamp: number;
  accountId: string;
}

export function normalizeMessage(
  msg: MCConvexMessage,
  accountId: string
): NormalizedMCConvexMessage {
  return {
    messageId: msg._id,
    conversationId: msg.conversationId,
    content: msg.content,
    senderId: msg.senderId,
    senderType: msg.senderType,
    senderName: msg.sender?.name,
    timestamp: msg._creationTime,
    accountId,
  };
}
