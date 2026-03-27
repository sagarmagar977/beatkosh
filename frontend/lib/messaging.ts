export type MessageAttachmentItem = {
  id: number;
  url: string;
  original_name: string;
  content_type: string;
  size: number;
  uploaded_at: string;
};

export type MessageItem = {
  id: number;
  conversation: number;
  sender: number;
  sender_username?: string;
  content: string;
  attachments: MessageAttachmentItem[];
  timestamp: string;
};

export type ConversationItem = {
  id: number;
  participants: number[];
  participant_details: Array<{ id: number; username: string }>;
  project?: number | null;
  project_title?: string | null;
  messages: MessageItem[];
  created_at: string;
};

export type SeenMessageMap = Record<number, number>;

export function getLatestMessage(conversation: ConversationItem) {
  return conversation.messages[conversation.messages.length - 1] ?? null;
}

export function getConversationActivityValue(conversation: ConversationItem) {
  const latestMessage = getLatestMessage(conversation);
  return new Date(latestMessage?.timestamp ?? conversation.created_at).getTime();
}

export function sortConversationsByLatestActivity(conversations: ConversationItem[]) {
  return [...conversations].sort((left, right) => {
    const delta = getConversationActivityValue(right) - getConversationActivityValue(left);
    if (delta !== 0) {
      return delta;
    }
    return right.id - left.id;
  });
}

function getSeenStorageKey(userId: number) {
  return `beatkosh:message-seen:${userId}`;
}

export function loadSeenMessageMap(userId?: number | null): SeenMessageMap {
  if (!userId || typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(getSeenStorageKey(userId));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [Number(key), Number(value)])
        .filter(([key, value]) => Number.isFinite(key) && Number.isFinite(value) && value > 0),
    );
  } catch {
    return {};
  }
}

export function persistSeenMessageMap(userId: number, seenMap: SeenMessageMap) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(getSeenStorageKey(userId), JSON.stringify(seenMap));
}

export function getLatestIncomingMessage(conversation: ConversationItem, userId?: number | null) {
  if (!userId) {
    return null;
  }

  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    const message = conversation.messages[index];
    if (message.sender !== userId) {
      return message;
    }
  }

  return null;
}

export function isConversationUnread(conversation: ConversationItem, userId?: number | null, seenMap: SeenMessageMap = {}) {
  const latestIncoming = getLatestIncomingMessage(conversation, userId);
  if (!latestIncoming) {
    return false;
  }
  return latestIncoming.id > (seenMap[conversation.id] ?? 0);
}

export function markConversationSeen(conversation: ConversationItem, userId?: number | null, seenMap: SeenMessageMap = {}) {
  const latestIncoming = getLatestIncomingMessage(conversation, userId);
  if (!latestIncoming) {
    return seenMap;
  }
  if ((seenMap[conversation.id] ?? 0) >= latestIncoming.id) {
    return seenMap;
  }
  return { ...seenMap, [conversation.id]: latestIncoming.id };
}

export function formatAttachmentSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}
