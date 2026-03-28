"use client";

import { FileAudio, FileImage, FileText, Paperclip, Send, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";
import {
  type ConversationItem,
  type MessageAttachmentItem,
  formatAttachmentSize,
  getAttachmentContentType,
  getLatestMessage,
  isConversationUnread,
  loadSeenMessageMap,
  markConversationSeen,
  persistSeenMessageMap,
  sortConversationsByLatestActivity,
} from "@/lib/messaging";

function getAttachmentIcon(attachment: Pick<MessageAttachmentItem, "content_type"> | File) {
  const contentType = getAttachmentContentType(attachment);
  if (contentType.startsWith("image/")) {
    return FileImage;
  }
  if (contentType.startsWith("audio/")) {
    return FileAudio;
  }
  return FileText;
}

function isImageAttachment(attachment: Pick<MessageAttachmentItem, "content_type"> | File) {
  return getAttachmentContentType(attachment).startsWith("image/");
}

function isAudioAttachment(attachment: Pick<MessageAttachmentItem, "content_type"> | File) {
  return getAttachmentContentType(attachment).startsWith("audio/");
}

export default function MessagesPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedConversationId = Number(searchParams.get("conversation") || "");
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [seenMap, setSeenMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedConversations = useMemo(() => sortConversationsByLatestActivity(conversations), [conversations]);

  const loadConversations = useCallback(async (preferredConversationId?: number | null) => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const data = sortConversationsByLatestActivity(await apiRequest<ConversationItem[]>("/conversations/", { token }));
      setConversations(data);
      const hasPreferred = preferredConversationId && data.some((item) => item.id === preferredConversationId);
      if (hasPreferred) {
        setSelectedConversationId(preferredConversationId);
      } else if (data.length > 0) {
        setSelectedConversationId((current) => (current && data.some((item) => item.id === current) ? current : data[0].id));
      } else {
        setSelectedConversationId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setSeenMap(loadSeenMessageMap(user?.id));
  }, [user?.id]);

  useEffect(() => {
    void loadConversations(Number.isFinite(requestedConversationId) ? requestedConversationId : null);
  }, [loadConversations, requestedConversationId]);

  const selectedConversation = useMemo(
    () => sortedConversations.find((item) => item.id === selectedConversationId) ?? null,
    [selectedConversationId, sortedConversations],
  );

  useEffect(() => {
    if (!user?.id || !selectedConversation) {
      return;
    }
    setSeenMap((current) => {
      const next = markConversationSeen(selectedConversation, user.id, current);
      if (next !== current) {
        persistSeenMessageMap(user.id, next);
      }
      return next;
    });
  }, [selectedConversation, user?.id]);

  const otherParticipant = useMemo(() => {
    if (!selectedConversation || !user) {
      return null;
    }
    return selectedConversation.participant_details.find((participant) => participant.id !== user.id) ?? null;
  }, [selectedConversation, user]);

  const unreadConversationCount = useMemo(
    () => sortedConversations.filter((conversation) => isConversationUnread(conversation, user?.id, seenMap)).length,
    [seenMap, sortedConversations, user?.id],
  );

  const submitMessage = useCallback(async () => {
    if (!token || !selectedConversation || (!draft.trim() && pendingFiles.length === 0)) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      if (pendingFiles.length > 0) {
        const formData = new FormData();
        formData.append("conversation", String(selectedConversation.id));
        formData.append("content", draft.trim());
        pendingFiles.forEach((file) => formData.append("files", file));
        await apiRequest("/messages/", {
          method: "POST",
          token,
          body: formData,
          isFormData: true,
        });
      } else {
        await apiRequest("/messages/", {
          method: "POST",
          token,
          body: {
            conversation: selectedConversation.id,
            content: draft.trim(),
          },
        });
      }
      setDraft("");
      setPendingFiles([]);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      await loadConversations(selectedConversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }, [draft, loadConversations, pendingFiles, selectedConversation, token]);

  const onComposerKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (sending || (!draft.trim() && pendingFiles.length === 0)) {
      return;
    }
    void submitMessage();
  }, [draft, pendingFiles.length, sending, submitMessage]);

  const onAttachmentChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    setPendingFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const nextFiles = files.filter((file) => !existing.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...nextFiles];
    });
    event.target.value = "";
  }, []);

  const removePendingFile = useCallback((fileToRemove: File) => {
    setPendingFiles((current) => current.filter((file) => file !== fileToRemove));
  }, []);

  return (
    <section className="messages-page theme-floating min-h-[calc(100vh-11rem)] overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] theme-text-faint">Messages</p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold theme-text-main">Accepted collaborations</h1>
            {unreadConversationCount > 0 ? (
              <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-[#ff4d6d] px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadConversationCount > 99 ? "99+" : unreadConversationCount}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm theme-text-muted">Newest chats stay at the top, unread replies get a red badge, and attachments can be sent directly from the composer.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs theme-text-soft">{sortedConversations.length} chats</span>
      </div>

      <div className="grid min-h-[calc(100vh-17rem)] grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="messages-sidebar flex min-h-0 flex-col border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
          <div className="border-b border-white/10 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] theme-text-faint">Inbox</p>
                <p className="mt-1 text-sm theme-text-muted">Open a collaboration to continue the chat.</p>
              </div>
              {unreadConversationCount > 0 ? (
                <span className="inline-flex min-w-[1.55rem] items-center justify-center rounded-full bg-[#ff4d6d] px-2 py-1 text-[10px] font-semibold leading-none text-white">
                  {unreadConversationCount > 99 ? "99+" : unreadConversationCount}
                </span>
              ) : null}
            </div>
            <div className="messages-search mt-4 flex h-11 items-center rounded-full px-4 text-sm theme-text-muted">
              <span>Search accepted chats</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <p className="px-4 py-4 text-sm theme-text-muted">Loading conversations...</p> : null}
            {!loading && sortedConversations.length === 0 ? (
              <div className="mx-4 my-4 rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm leading-6 theme-text-muted">
                No conversations yet. Messaging unlocks after a hiring offer is accepted.
              </div>
            ) : null}
            {!loading && sortedConversations.map((conversation) => {
              const other = conversation.participant_details.find((participant) => participant.id !== user?.id);
              const latest = getLatestMessage(conversation);
              const active = conversation.id === selectedConversationId;
              const title = other?.username || "Conversation";
              const unread = isConversationUnread(conversation, user?.id, seenMap);
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    router.replace(`/messages?conversation=${conversation.id}`);
                  }}
                  className={`messages-row flex w-full items-start gap-3 border-b border-white/6 px-4 py-4 text-left transition ${active ? "messages-row-active" : ""}`}
                >
                  <div className="relative">
                    <div className={`messages-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${active ? "messages-avatar-active" : ""}`}>
                      {title.slice(0, 1).toUpperCase()}
                    </div>
                    {unread ? <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#0d1015] bg-[#ff4d6d]" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="theme-text-main truncate text-sm font-semibold">{title}</p>
                          {unread ? <span className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-[#ff4d6d] px-1.5 py-0.5 text-[10px] font-semibold text-white">1</span> : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] theme-text-faint">{conversation.project_title || "Direct collaboration chat"}</p>
                      </div>
                      <p className={`shrink-0 text-[11px] ${active ? "text-[#9ef0b5]" : unread ? "text-[#ff9daf]" : "theme-text-faint"}`}>
                        {latest
                          ? new Date(latest.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : new Date(conversation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className={`mt-2 truncate text-sm ${active ? "text-white/88" : unread ? "text-white" : "theme-text-muted"}`}>
                      {latest?.content || (latest?.attachments.length ? `${latest.attachments.length} attachment${latest.attachments.length > 1 ? "s" : ""}` : "No messages sent yet.")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="messages-thread flex min-h-0 flex-col">
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                <div className="messages-thread-avatar flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold">
                  {(otherParticipant?.username || "C").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold theme-text-main">{otherParticipant?.username || "Collaboration"}</h2>
                  <p className="truncate text-sm theme-text-muted">{selectedConversation.project_title || "Shared project conversation"}</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
                <div className="mx-auto flex max-w-4xl flex-col gap-3">
                  {selectedConversation.messages.length > 0 ? selectedConversation.messages.map((item) => {
                    const mine = item.sender === user?.id;
                    return (
                      <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-[22px] px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.18)] ${mine ? "messages-bubble-own rounded-br-md" : "messages-bubble-other rounded-bl-md"}`}>
                          <p className="messages-bubble-meta text-[10px] font-medium uppercase tracking-[0.18em]">{item.sender_username || "User"}</p>
                          {item.content ? <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap">{item.content}</p> : null}
                          {item.attachments.length > 0 ? (
                            <div className="mt-2 flex flex-col gap-2">
                              {item.attachments.map((attachment) => {
                                const Icon = getAttachmentIcon(attachment);
                                const attachmentUrl = resolveMediaUrl(attachment.url);
                                const imageAttachment = isImageAttachment(attachment);
                                const audioAttachment = isAudioAttachment(attachment);

                                if (imageAttachment) {
                                  return (
                                    <div
                                      key={attachment.id}
                                      className={`overflow-hidden rounded-2xl border ${mine ? "border-white/15 bg-white/10" : "border-white/10 bg-white/5"}`}
                                    >
                                      <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block">
                                        <Image
                                          src={attachmentUrl}
                                          alt={attachment.original_name}
                                          width={1200}
                                          height={900}
                                          className="max-h-[22rem] w-full rounded-b-none object-cover"
                                        />
                                      </a>
                                      <div className="flex items-center gap-3 px-3 py-2 text-xs">
                                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                                        <a
                                          href={attachmentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="messages-attachment-link min-w-0 flex-1 truncate underline-offset-2 hover:underline"
                                        >
                                          {attachment.original_name}
                                        </a>
                                        <span className="messages-attachment-meta shrink-0">{formatAttachmentSize(attachment.size)}</span>
                                      </div>
                                    </div>
                                  );
                                }

                                if (audioAttachment) {
                                  return (
                                    <div
                                      key={attachment.id}
                                      className={`rounded-2xl border px-3 py-3 ${mine ? "border-white/15 bg-white/10" : "border-white/10 bg-white/5"}`}
                                    >
                                      <div className="mb-2 flex items-center gap-3 text-xs">
                                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                                        <a
                                          href={attachmentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="messages-attachment-link min-w-0 flex-1 truncate underline-offset-2 hover:underline"
                                        >
                                          {attachment.original_name}
                                        </a>
                                        <span className="messages-attachment-meta shrink-0">{formatAttachmentSize(attachment.size)}</span>
                                      </div>
                                      <audio controls preload="metadata" className="h-11 w-full">
                                        <source src={attachmentUrl} type={attachment.content_type || undefined} />
                                        Your browser does not support audio playback.
                                      </audio>
                                    </div>
                                  );
                                }

                                return (
                                  <a
                                    key={attachment.id}
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs transition ${mine ? "border-white/15 bg-white/10 hover:bg-white/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                                  >
                                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate">{attachment.original_name}</span>
                                    <span className="messages-attachment-meta shrink-0">{formatAttachmentSize(attachment.size)}</span>
                                  </a>
                                );
                              })}
                            </div>
                          ) : null}
                          <p className="messages-bubble-time mt-2 text-[11px]">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm theme-text-muted">
                      This project chat is ready. Send the first message.
                    </div>
                  )}
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitMessage();
                }}
                className="messages-compose border-t border-white/10 px-4 py-4 sm:px-5"
              >
                {pendingFiles.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pendingFiles.map((file) => {
                      const Icon = getAttachmentIcon(file);
                      return (
                        <div key={`${file.name}-${file.size}-${file.lastModified}`} className="theme-soft theme-text-soft flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs">
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                          <span className="max-w-[12rem] truncate">{file.name}</span>
                          <span className="theme-text-faint">{formatAttachmentSize(file.size)}</span>
                          <button type="button" onClick={() => removePendingFile(file)} className="theme-text-faint transition hover:text-[var(--text)]" aria-label={`Remove ${file.name}`}>
                            <X className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <div className="messages-compose-box flex items-end gap-3 rounded-[26px] p-2 pl-3">
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    className="theme-soft theme-text-soft inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 transition"
                    aria-label="Attach file"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  </button>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z,.ppt,.pptx,.xls,.xlsx"
                    className="hidden"
                    onChange={onAttachmentChange}
                  />
                  <label className="block flex-1">
                    <span className="sr-only">Message</span>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={onComposerKeyDown}
                      placeholder="Type a message"
                      className="messages-compose-input min-h-[56px] w-full resize-none bg-transparent py-3 text-sm outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={sending || (!draft.trim() && pendingFiles.length === 0)}
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1ed760] text-[#07140b] transition disabled:opacity-60"
                    aria-label={sending ? "Sending message" : "Send message"}
                  >
                    <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-[11px] theme-text-faint">Enter sends the message, Shift+Enter adds a new line, and the paperclip supports images, audio, and documents.</p>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm uppercase tracking-[0.24em] theme-text-faint">No chat selected</p>
              <h2 className="mt-3 text-2xl font-semibold theme-text-main">Choose a conversation from the left</h2>
              <p className="mt-3 max-w-md text-sm leading-6 theme-text-muted">This page now follows the same WhatsApp-like structure as the overlay, with unread badges, top-sorted recent chats, and attachment sending.</p>
              <Link href="/activity" className="theme-soft theme-text-soft mt-6 rounded-full border border-white/10 px-5 py-2.5 text-sm transition hover:bg-white/[0.05]">Back to activity</Link>
            </div>
          )}

          {error ? <p className="px-4 pb-4 text-sm text-[#ffb4a9] sm:px-5">{error}</p> : null}
        </section>
      </div>
    </section>
  );
}
