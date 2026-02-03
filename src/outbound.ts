import type { MCConvexAccount, MCConvexApiResponse } from "./types.js";

export interface SendMessageOptions {
  conversationId: string;
  content: string;
  messageType?: "text" | "code" | "markdown";
  account: MCConvexAccount;
}

// Sanitize content to remove invalid Unicode characters that break JSON parsing
function sanitizeContent(content: string): string {
  // Remove replacement characters and other invalid Unicode
  return content
    .replace(/\uFFFD/g, "") // Remove replacement character
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters except newline/tab/cr
    .replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u"); // Fix incomplete unicode escapes
}

export async function sendMessage(options: SendMessageOptions): Promise<{ messageId: string }> {
  const { conversationId, content, messageType = "text", account } = options;

  // Sanitize content before sending
  const sanitizedContent = sanitizeContent(content);

  const response = await fetch(`${account.apiUrl}/chat/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${account.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      content: sanitizedContent,
      messageType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${response.status} - ${error}`);
  }

  const data = await response.json() as MCConvexApiResponse<{ _id: string }>;
  
  if (!data.success) {
    throw new Error(`API error: ${data.error}`);
  }

  const message = data.message as { _id: string } | undefined;
  return { messageId: message?._id || "unknown" };
}

export async function getConversations(account: MCConvexAccount): Promise<any[]> {
  const response = await fetch(`${account.apiUrl}/chat/conversations`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${account.apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get conversations: ${response.status}`);
  }

  const data = await response.json() as MCConvexApiResponse<any[]>;
  
  if (!data.success) {
    throw new Error(`API error: ${data.error}`);
  }

  return (data.conversations as any[]) || [];
}

export async function getMessages(
  account: MCConvexAccount,
  conversationId: string
): Promise<any[]> {
  const response = await fetch(
    `${account.apiUrl}/chat/messages?conversationId=${conversationId}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${account.apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.status}`);
  }

  const data = await response.json() as MCConvexApiResponse<any[]>;
  
  if (!data.success) {
    throw new Error(`API error: ${data.error}`);
  }

  return (data.messages as any[]) || [];
}
