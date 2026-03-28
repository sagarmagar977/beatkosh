"use client";

import { ChevronRight, Compass, FileAudio, FileImage, FileText, Home, LogOut, MessageSquareMore, Paperclip, Search, Send, Settings, ShoppingCart, SunMoon, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthScreen } from "@/app/auth-screen";
import { useAuth } from "@/app/auth-context";
import { AppBootSkeleton } from "@/app/page-skeletons";
import { useTheme } from "@/app/providers";
import { GlobalPlayer } from "@/components/global-player";
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

const GLOBAL_FLASH_SESSION_KEY = "beatkosh-global-flash";

type AppNotification = {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: number;
  actor_username: string;
  beat_id?: number | null;
  beat_title?: string | null;
};

function getMessageAttachmentIcon(attachment: Pick<MessageAttachmentItem, "content_type"> | File) {
  const contentType = getAttachmentContentType(attachment);
  if (contentType.startsWith("image/")) {
    return FileImage;
  }
  if (contentType.startsWith("audio/")) {
    return FileAudio;
  }
  return FileText;
}

type MessageDrawerTarget = {
  conversationId?: number;
  participantId?: number;
};

type FloatingOverlay = "messages" | "notifications" | "userMenu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const HEADER_CLEARANCE_PX = 3;
  const DEFAULT_HEADER_HEIGHT = 112;
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, loading, logout, startSelling, switchRole, refreshMe, meError } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [hoverMenuOpen, setHoverMenuOpen] = useState<string | null>(null);
  const [pinnedMenuOpen, setPinnedMenuOpen] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [pendingMessageFiles, setPendingMessageFiles] = useState<File[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [seenMessageMap, setSeenMessageMap] = useState<Record<number, number>>({});
  const [pendingMessageTarget, setPendingMessageTarget] = useState<MessageDrawerTarget | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);
  const [artistEditorOpen, setArtistEditorOpen] = useState(false);
  const [startSellingBusy, setStartSellingBusy] = useState(false);
  const [startSellingError, setStartSellingError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [allowDegradedSession, setAllowDegradedSession] = useState(false);
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [globalFlash, setGlobalFlash] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [artistProfileName, setArtistProfileName] = useState("");
  const [artistProfileAvatar, setArtistProfileAvatar] = useState<File | null>(null);
  const [artistProfileAvatarPreview, setArtistProfileAvatarPreview] = useState("");
  const [artistProfileSaving, setArtistProfileSaving] = useState(false);
  const [artistProfileError, setArtistProfileError] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<FloatingOverlay | null>(null);

  const userMenuCloseTimeout = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const messageAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);

  const hasSession = Boolean(token);
  const profileHref = user?.is_producer ? "/producer/profile" : null;
  const producerName = user?.producer_profile?.producer_name?.trim() || "";
  const artistName = user?.artist_profile?.stage_name?.trim() || "";
  const activeDisplayName = user?.active_role === "producer"
    ? producerName || artistName || user?.username || "Producer"
    : artistName || producerName || user?.username || "Artist";
  const activeAvatarUrl = resolveMediaUrl(
    user?.active_role === "artist"
      ? user?.artist_profile?.avatar_obj || user?.producer_profile?.avatar_obj
      : user?.producer_profile?.avatar_obj || user?.artist_profile?.avatar_obj,
  );
  const avatarFallback = activeDisplayName.slice(0, 1).toUpperCase();
  const unreadNotificationsCount = notifications.filter((item) => !item.is_read).length;
  const sortedConversations = useMemo(() => sortConversationsByLatestActivity(conversations), [conversations]);
  const selectedConversation = useMemo(
    () => sortedConversations.find((item) => item.id === selectedConversationId) ?? null,
    [selectedConversationId, sortedConversations],
  );
  const selectedConversationPartner = useMemo(() => {
    if (!selectedConversation || !user) {
      return null;
    }
    return selectedConversation.participant_details.find((participant) => participant.id !== user.id) ?? null;
  }, [selectedConversation, user]);
  const unreadMessagesCount = useMemo(
    () => sortedConversations.filter((conversation) => isConversationUnread(conversation, user?.id, seenMessageMap)).length,
    [seenMessageMap, sortedConversations, user?.id],
  );

  const normalizedPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const producerWorkspaceRoutes = ["/producer/profile", "/producer/upload-wizard", "/producer/settings", "/producer/media-uploads", "/dashboard/selling", "/wallet"];
  const isProducerWorkspaceRoute = producerWorkspaceRoutes.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
  const publicAuthRoutes = ["/auth/login", "/auth/register"];
  const isPublicAuthRoute = publicAuthRoutes.includes(normalizedPath);
  const isProtectedRoute = !isPublicAuthRoute;
  const hideGlobalPlayer = normalizedPath.startsWith("/producer/upload-wizard");
  const isOrdersRoute = normalizedPath === "/orders";
  const isActivityRoute = normalizedPath === "/activity";

  useEffect(() => {
    if (loading) {
      return;
    }
    if (isProtectedRoute && !hasSession) {
      router.replace("/auth/login");
      return;
    }
    if (isPublicAuthRoute && hasSession) {
      router.replace("/");
      return;
    }
    if (!user || !isProducerWorkspaceRoute) {
      return;
    }

    const redirectToListening = (message: string) => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(GLOBAL_FLASH_SESSION_KEY, message);
      }
      router.replace("/dashboard/listening");
    };

    if (!user.is_producer) {
      redirectToListening("Enable producer mode first to access the seller workspace.");
      return;
    }
    if (user.active_role !== "producer") {
      redirectToListening("Switch to producer mode from your avatar menu to access the seller workspace.");
    }
  }, [hasSession, isProducerWorkspaceRoute, isProtectedRoute, isPublicAuthRoute, loading, router, user]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinnedMenuOpen(null);
        setHoverMenuOpen(null);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setUserSettingsOpen(false);
        setArtistEditorOpen(false);
        setUploadPickerOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const clickedNotificationsButton = notificationsRef.current?.contains(event.target as Node) ?? false;
      const clickedNotificationsPanel = notificationsPanelRef.current?.contains(event.target as Node) ?? false;
      if (!clickedNotificationsButton && !clickedNotificationsPanel) {
        setNotificationsOpen(false);
      }
      if (!navRef.current) {
        return;
      }
      if (navRef.current.contains(event.target as Node)) {
        return;
      }
      setPinnedMenuOpen(null);
      setHoverMenuOpen(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.sessionStorage.getItem(GLOBAL_FLASH_SESSION_KEY);
    if (!raw) {
      return;
    }
    setGlobalFlash(raw);
    window.sessionStorage.removeItem(GLOBAL_FLASH_SESSION_KEY);
    const timer = window.setTimeout(() => setGlobalFlash(null), 3200);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const syncHeaderHeight = () => {
      setHeaderHeight(headerRef.current?.offsetHeight ?? DEFAULT_HEADER_HEIGHT);
    };

    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && headerRef.current) {
      resizeObserver = new ResizeObserver(syncHeaderHeight);
      resizeObserver.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", syncHeaderHeight);
      resizeObserver?.disconnect();
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      return;
    }

    setNotificationsLoading(true);
    try {
      const data = await apiRequest<AppNotification[]>("/account/notifications/me/", { token });
      setNotifications(data);
    } catch {
      // Ignore transient notification failures so the rest of the shell stays usable.
    } finally {
      setNotificationsLoading(false);
    }
  }, [token]);

  const loadConversations = useCallback(async (preferredTarget?: MessageDrawerTarget | null) => {
    if (!token) {
      return;
    }

    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const data = sortConversationsByLatestActivity(await apiRequest<ConversationItem[]>("/conversations/", { token }));
      setConversations(data);
      const preferredConversationId = preferredTarget?.conversationId;
      const preferredParticipantId = preferredTarget?.participantId;
      const preferredConversation = preferredConversationId
        ? data.find((item) => item.id === preferredConversationId)
        : preferredParticipantId
          ? data.find((item) => item.participant_details.some((participant) => participant.id === preferredParticipantId))
          : null;

      if (preferredConversation) {
        setSelectedConversationId(preferredConversation.id);
      } else if (data.length > 0) {
        setSelectedConversationId((current) => (
          current && data.some((item) => item.id === current) ? current : data[0].id
        ));
      } else {
        setSelectedConversationId(null);
      }
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, [token]);

  const markNotificationRead = useCallback(async (notificationId: number) => {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/account/notifications/${notificationId}/read/`, { method: "POST", token, body: {} });
      setNotifications((current) => current.map((item) => (
        item.id === notificationId ? { ...item, is_read: true } : item
      )));
    } catch {
      // Keep the notification visible if marking as read fails.
    }
  }, [token]);

  const openMessagesPanel = useCallback((target?: MessageDrawerTarget | null) => {
    setUserMenuOpen(false);
    setUserSettingsOpen(false);
    setMessagesOpen(true);
    setActiveOverlay("messages");
    if (target) {
      setPendingMessageTarget(target);
    }
  }, []);

  const handleMessagePanelToggle = useCallback(() => {
    setMessagesOpen((current) => {
      if (current) {
        setPendingMessageTarget(null);
        return false;
      }
      setActiveOverlay("messages");
      return true;
    });
    setUserMenuOpen(false);
    setUserSettingsOpen(false);
  }, []);

  const handleNotificationSelect = useCallback(async (item: AppNotification) => {
    await markNotificationRead(item.id);
    setNotificationsOpen(false);

    if (item.notification_type === "project_proposal_accepted") {
      openMessagesPanel({ participantId: item.actor_id });
      return;
    }

    if (item.beat_id) {
      router.push(`/beats/${item.beat_id}`);
      return;
    }

    if (item.notification_type === "producer_followed") {
      router.push(`/producers/${item.actor_id}`);
    }
  }, [markNotificationRead, openMessagesPanel, router]);

  const handleSendMessage = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!token || !selectedConversation || (!messageDraft.trim() && pendingMessageFiles.length === 0)) {
      return;
    }

    setSendingMessage(true);
    setMessagesError(null);
    try {
      if (pendingMessageFiles.length > 0) {
        const formData = new FormData();
        formData.append("conversation", String(selectedConversation.id));
        formData.append("content", messageDraft.trim());
        pendingMessageFiles.forEach((file) => formData.append("files", file));
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
            content: messageDraft.trim(),
          },
        });
      }
      setMessageDraft("");
      setPendingMessageFiles([]);
      if (messageAttachmentInputRef.current) {
        messageAttachmentInputRef.current.value = "";
      }
      await loadConversations({ conversationId: selectedConversation.id });
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSendingMessage(false);
    }
  }, [loadConversations, messageDraft, pendingMessageFiles, selectedConversation, token]);

  const handleMessageComposerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (sendingMessage || (!messageDraft.trim() && pendingMessageFiles.length === 0)) {
      return;
    }
    void handleSendMessage();
  }, [handleSendMessage, messageDraft, pendingMessageFiles.length, sendingMessage]);

  const handleMessageAttachmentChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    setPendingMessageFiles((current) => {
      const existing = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const nextFiles = files.filter((file) => !existing.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...nextFiles];
    });
    event.target.value = "";
  }, []);

  const removePendingMessageFile = useCallback((fileToRemove: File) => {
    setPendingMessageFiles((current) => current.filter((file) => file !== fileToRemove));
  }, []);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      return;
    }

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications, token]);

  useEffect(() => {
    if (!token || !messagesOpen) {
      return;
    }
    void loadConversations(pendingMessageTarget);
  }, [loadConversations, messagesOpen, pendingMessageTarget, token]);

  useEffect(() => {
    setSeenMessageMap(loadSeenMessageMap(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !selectedConversation) {
      return;
    }
    setSeenMessageMap((current) => {
      const next = markConversationSeen(selectedConversation, user.id, current);
      if (next !== current) {
        persistSeenMessageMap(user.id, next);
      }
      return next;
    });
  }, [selectedConversation, user?.id]);

  useEffect(() => {
    if (typeof document === "undefined" || !messagesOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [messagesOpen]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }
    void loadNotifications();
  }, [loadNotifications, notificationsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onOpenMessages = (event: Event) => {
      const detail = (event as CustomEvent<MessageDrawerTarget>).detail ?? {};
      openMessagesPanel(detail);
    };

    window.addEventListener("beatkosh:open-messages", onOpenMessages as EventListener);
    return () => {
      window.removeEventListener("beatkosh:open-messages", onOpenMessages as EventListener);
    };
  }, [openMessagesPanel]);

  useEffect(() => {
    if (!pendingMessageTarget || messagesLoading) {
      return;
    }

    const matchedConversation = pendingMessageTarget.conversationId
      ? conversations.some((item) => item.id === pendingMessageTarget.conversationId)
      : pendingMessageTarget.participantId
        ? conversations.some((item) => item.participant_details.some((participant) => participant.id === pendingMessageTarget.participantId))
        : true;

    if (matchedConversation || conversations.length === 0) {
      setPendingMessageTarget(null);
    }
  }, [conversations, messagesLoading, pendingMessageTarget]);

  useEffect(() => {
    setActiveOverlay((current) => {
      if (current === "userMenu" && userMenuOpen) {
        return current;
      }
      if (current === "notifications" && notificationsOpen) {
        return current;
      }
      if (current === "messages" && messagesOpen) {
        return current;
      }
      if (userMenuOpen) {
        return "userMenu";
      }
      if (notificationsOpen) {
        return "notifications";
      }
      if (messagesOpen) {
        return "messages";
      }
      return null;
    });
  }, [messagesOpen, notificationsOpen, userMenuOpen]);

  useEffect(() => {
    setArtistProfileName(user?.artist_profile?.stage_name ?? "");
    setArtistProfileAvatar(null);
    setArtistProfileAvatarPreview(resolveMediaUrl(user?.artist_profile?.avatar_obj));
    setArtistProfileError(null);
  }, [user?.artist_profile?.avatar_obj, user?.artist_profile?.stage_name]);


  const openMenuKey = pinnedMenuOpen ?? hoverMenuOpen;
  const messagesOverlayZClass = activeOverlay === "messages" ? "z-[117]" : "z-[70]";
  const messagesPanelZClass = activeOverlay === "messages" ? "z-[118]" : "z-[71]";
  const notificationsPanelZClass = activeOverlay === "notifications" ? "z-[140]" : "z-[90]";
  const userMenuPanelZClass = activeOverlay === "userMenu" ? "z-[150]" : "z-[95]";
  const menuPrimaryAction = !(user?.is_producer) ? (
    <button
      type="button"
      onClick={async () => {
        setStartSellingBusy(true);
        setStartSellingError(null);
        try {
          await startSelling();
          setUserMenuOpen(false);
          router.push("/producer/profile");
        } catch (err) {
          setStartSellingError(err instanceof Error ? err.message : "Unable to start selling");
        } finally {
          setStartSellingBusy(false);
        }
      }}
      disabled={startSellingBusy}
      className="rounded-xl bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-3 py-3 text-left text-sm font-semibold text-white disabled:opacity-60"
    >
      {startSellingBusy ? "Starting..." : "Start Selling"}
    </button>
  ) : user.active_role === "producer" ? (
    <button
      type="button"
      onClick={() => {
        setUserMenuOpen(false);
        setUploadPickerOpen(true);
      }}
      className="rounded-xl bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-3 py-3 text-left text-sm font-semibold text-white"
    >
      Upload
    </button>
  ) : (
    <button
      type="button"
      onClick={async () => {
        setStartSellingBusy(true);
        setStartSellingError(null);
        try {
          await switchRoleInPlace("producer");
        } catch (err) {
          setStartSellingError(err instanceof Error ? err.message : "Unable to switch to producer mode");
        } finally {
          setStartSellingBusy(false);
        }
      }}
      disabled={startSellingBusy}
      className="rounded-xl bg-gradient-to-r from-[#2d3348] via-[#3b4663] to-[#56637f] px-3 py-3 text-left text-sm font-semibold text-white disabled:opacity-60"
    >
      {startSellingBusy ? "Switching..." : "Producer Mode"}
    </button>
  );
  const isBrowseActive = normalizedPath === "/activity";
  const isHomeActive =
    normalizedPath === "/" || normalizedPath === "/dashboard/listening" || normalizedPath === "/dashboard/selling";

  const switchRoleInPlace = useCallback(
    async (role: "artist" | "producer") => {
      await switchRole(role);
      setUserMenuOpen(false);
      setUserSettingsOpen(false);
      setArtistEditorOpen(false);
      setPinnedMenuOpen(null);
      setHoverMenuOpen(null);
      router.refresh();
    },
    [router, switchRole],
  );

  const handleArtistAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setArtistProfileAvatar(nextFile);
    setArtistProfileAvatarPreview(nextFile ? URL.createObjectURL(nextFile) : resolveMediaUrl(user?.artist_profile?.avatar_obj));
  };

  const saveArtistProfile = async () => {
    if (!token) {
      return;
    }

    setArtistProfileSaving(true);
    setArtistProfileError(null);
    try {
      if (artistProfileAvatar) {
        const form = new FormData();
        form.append("stage_name", artistProfileName.trim());
        form.append("avatar_upload", artistProfileAvatar);
        await apiRequest("/account/artist-profile/", { method: "PATCH", token, body: form, isFormData: true });
      } else {
        await apiRequest("/account/artist-profile/", {
          method: "PATCH",
          token,
          body: { stage_name: artistProfileName.trim() },
        });
      }
      await refreshMe();
      setArtistEditorOpen(false);
      setUserSettingsOpen(false);
      router.refresh();
    } catch (err) {
      setArtistProfileError(err instanceof Error ? err.message : "Could not update artist profile");
    } finally {
      setArtistProfileSaving(false);
    }
  };

  const cancelUserMenuClose = () => {
    if (userMenuCloseTimeout.current) {
      window.clearTimeout(userMenuCloseTimeout.current);
    }
  };

  const closeUserMenuSoon = () => {
    cancelUserMenuClose();
    userMenuCloseTimeout.current = window.setTimeout(() => {
      setUserMenuOpen(false);
      setUserSettingsOpen(false);
    }, 120);
  };

  const runSearch = () => {
    const next = searchQuery.trim();
    setPinnedMenuOpen(null);
    setHoverMenuOpen(null);
    router.push(next ? `/beats?query=${encodeURIComponent(next)}` : "/beats");
  };

  if (isPublicAuthRoute) {
    return <AuthScreen mode={normalizedPath === "/auth/register" ? "register" : "login"} />;
  }

  if (loading) {
    return <AppBootSkeleton />;
  }

  if (hasSession && !user && !allowDegradedSession) {
    const isNetworkFailure = meError?.status === 0;
    return (
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-4 px-6 text-center theme-text-main">
        <p className="text-sm theme-text-muted">Signed in, but we could not load your profile.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await refreshMe();
              } catch {
                // ignore
              }

            }}
            className="theme-soft rounded-full px-4 py-2 text-xs theme-text-soft"
          >
            Retry
          </button>
          {isNetworkFailure ? (
            <button
              type="button"
              onClick={() => setAllowDegradedSession(true)}
              className="theme-soft rounded-full px-4 py-2 text-xs theme-text-soft"
            >
              Continue
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/auth/login");
            }}
            className="theme-soft rounded-full px-4 py-2 text-xs theme-text-soft"
          >
            Logout
          </button>
        </div>
        <div className="theme-surface-muted mt-1 w-full max-w-[520px] rounded-2xl p-4 text-left">
          <p className="text-xs theme-text-muted">/account/me failed{meError ? ` (status ${meError.status})` : ""}:</p>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-3 text-[11px] theme-text-soft">{meError?.bodyText ?? "No details"}</pre>
        </div>
        {isNetworkFailure ? (
          <p className="text-xs theme-text-faint">
            You can continue while the backend is unreachable, but some features may fail.
          </p>
        ) : null}
      </div>
    );
  }


  // Legacy-route guard removed now that auth context is unified.

  return (
    <div
      className={isOrdersRoute || isActivityRoute ? "app-theme flex h-screen flex-col overflow-hidden" : "app-theme min-h-screen"}
      style={
        {
          "--app-header-height": `${headerHeight}px`,
          paddingTop: `calc(var(--app-header-height) + ${HEADER_CLEARANCE_PX}px)`,
        } as CSSProperties
      }
    >
      <header ref={headerRef} className="theme-header theme-header-shell fixed inset-x-0 top-0 z-[110] isolate border-b" style={{ borderColor: "var(--line)" }}>
        <div className="theme-app-shell-backdrop absolute inset-0 -z-10" aria-hidden="true" />
        <div className="theme-app-shell-row relative z-10 flex w-full items-center gap-3 px-3 py-3 md:px-4 lg:px-5">
          <Link href="/" className="hidden shrink-0 text-3xl font-black tracking-[-0.07em] md:block" style={{ color: "var(--brand)" }}>
            B
          </Link>

          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex md:pl-24 lg:pl-28 xl:pl-32">
            <div className="flex min-w-0 items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPinnedMenuOpen(null);
                  setHoverMenuOpen(null);
                  router.push("/");
                }}
                className={`pointer-events-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                  isHomeActive
                    ? "theme-nav-button-active"
                    : "theme-nav-button"
                }`}
                aria-label="Go home"
                title="Home"
              >
                <Home className="h-4.5 w-4.5" strokeWidth={2} aria-hidden="true" />
              </button>

              <form
                className="theme-search-shell pointer-events-auto flex h-11 min-w-0 w-full max-w-[420px] items-center rounded-full px-3 lg:max-w-[500px] lg:px-3.5 xl:w-[460px]"
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch();
                }}
              >
                <button
                  type="submit"
                  className="theme-search-action mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition"
                  aria-label="Search"
                >
                  <Search className="h-[1.1rem] w-[1.1rem]" strokeWidth={2} aria-hidden="true" />
                </button>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => {
                    setPinnedMenuOpen("Browse");
                    setHoverMenuOpen("Browse");
                  }}
                  className="theme-search-input min-w-0 flex-1 bg-transparent text-[0.92rem] outline-none"
                  placeholder="What do you want to play?"
                />
                <div className="theme-search-divider mx-2.5 h-6 w-px" />
                <button
                  type="button"
                  onClick={() => {
                    setPinnedMenuOpen("Browse");
                    setHoverMenuOpen("Browse");
                    router.push("/activity");
                  }}
                  className="theme-search-action inline-flex h-7 w-7 items-center justify-center rounded-full transition"
                  aria-label="Open browse"
                  title="Browse"
                >
                  <Compass className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>

          <Link href="/" className="text-3xl font-black tracking-[-0.07em] md:hidden" style={{ color: "var(--brand)" }}>
            B
          </Link>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div
              ref={notificationsRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((current) => {
                    const next = !current;
                    if (next) {
                      setActiveOverlay("notifications");
                    }
                    return next;
                  });
                }}
                className="theme-nav-button relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full px-0 text-xs transition"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <span className="sr-only">Notifications</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M10 21a2 2 0 0 0 4 0" />
                </svg>
                {unreadNotificationsCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#ff4d6d] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                  </span>
                ) : null}
              </button>
            </div>

            <Link
              href="/orders"
              className="theme-nav-button relative hidden h-10 w-10 items-center justify-center rounded-full text-xs transition lg:inline-flex"
              aria-label="Cart"
              title="Cart"
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            </Link>

              <button
                type="button"
                onClick={handleMessagePanelToggle}
              className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full px-0 text-xs transition ${
                messagesOpen
                  ? "theme-nav-button-active text-[#178a62]"
                  : "theme-nav-button"
              }`}
              aria-label="Messages"
              title="Messages"
              aria-expanded={messagesOpen}
            >
              <MessageSquareMore className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
              {unreadMessagesCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#ff4d6d] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </span>
              ) : null}
            </button>

            <div
              className="relative"
              onMouseLeave={closeUserMenuSoon}
            >
              <button
                type="button"
                onClick={() => {
                  cancelUserMenuClose();
                  setUserMenuOpen((current) => {
                    const next = !current;
                    if (next) {
                      setActiveOverlay("userMenu");
                    }
                    return next;
                  });
                }}
                onFocus={cancelUserMenuClose}
                className="theme-nav-button flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-xs font-semibold"
                aria-label="Open user menu"
                aria-expanded={userMenuOpen}
              >
                {activeAvatarUrl ? (
                  <img
                    src={activeAvatarUrl}
                    alt={activeDisplayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarFallback
                )}
              </button>

              <div
                className={`theme-menu absolute right-0 top-[46px] ${userMenuPanelZClass} w-[min(360px,calc(100vw-1.25rem))] max-h-[min(78vh,640px)] overflow-y-auto rounded-[26px] p-3 backdrop-blur-xl transition-all duration-220 ease-out ${userMenuOpen ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"}`}
                onMouseEnter={cancelUserMenuClose}
                onMouseLeave={closeUserMenuSoon}
              >
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#1c1722] text-sm font-semibold text-white">
                      {activeAvatarUrl ? (
                        <img src={activeAvatarUrl} alt={activeDisplayName} className="h-full w-full object-cover" />
                      ) : (
                        avatarFallback
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.22em] theme-text-faint">
                        {user?.active_role === "producer" ? "Producer account" : "Artist account"}
                      </p>
                      <p className="mt-1 break-words text-base font-semibold leading-5 theme-text-main">{activeDisplayName}</p>
                      <p className="mt-1 break-all text-xs theme-text-faint">@{user?.username ?? ""}</p>
                    </div>
                  </div>
                </div>

                {user?.is_producer ? (
                  <div className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-2.5">
                    <div className="flex items-center justify-between gap-3 px-1 pb-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] theme-text-faint">Switch mode</p>
                      <p className="text-[11px] capitalize theme-text-faint">{user.active_role}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["artist", "producer"] as const).map((role) => {
                        const active = user.active_role === role;
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={active}
                            onClick={async () => {
                              try {
                                await switchRoleInPlace(role);
                              } catch (err) {
                                setStartSellingError(err instanceof Error ? err.message : "Unable to switch mode");
                              }
                            }}
                            className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${active ? "bg-[#f6b067] text-[#20150e]" : "theme-soft theme-text-soft"}`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2">
                  {menuPrimaryAction}

                  {user?.active_role === "producer" && profileHref ? (
                    <Link href={profileHref} className="theme-soft flex items-center justify-between rounded-xl px-3 py-3 text-sm theme-text-soft">
                      <span>My profile</span>
                      <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setUserSettingsOpen((current) => !current)}
                    className="theme-soft rounded-xl px-3 py-3 text-left text-sm theme-text-soft"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-3">
                        <Settings className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        <span>Settings</span>
                      </span>
                      <ChevronRight className={`h-4 w-4 transition ${userSettingsOpen ? "rotate-90" : "rotate-0"}`} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </button>

                  {userSettingsOpen ? (
                    <div className="rounded-[20px] border border-white/10 bg-black/10 p-2">
                      {user?.active_role === "artist" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setArtistProfileError(null);
                            setArtistEditorOpen(true);
                          }}
                          className="theme-soft mb-2 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm theme-text-soft"
                        >
                          <span className="inline-flex items-center gap-3">
                            <UserRound className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                            <span>Edit profile</span>
                          </span>
                          <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      ) : (
                        <Link href="/producer/settings" className="theme-soft mb-2 flex items-center justify-between rounded-xl px-3 py-3 text-sm theme-text-soft">
                          <span className="inline-flex items-center gap-3">
                            <Settings className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                            <span>Seller settings</span>
                          </span>
                          <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="theme-soft flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm theme-text-soft"
                      >
                        <span className="inline-flex items-center gap-3">
                          <SunMoon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                          <span>Switch to {theme === "dark" ? "light" : "dark"} mode</span>
                        </span>
                        <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={logoutBusy}
                    onClick={() => {
                      setLogoutBusy(true);
                      try {
                        logout();
                      } finally {
                        setLogoutBusy(false);
                        setUserMenuOpen(false);
                        setUserSettingsOpen(false);
                        router.replace("/auth/login");
                      }
                    }}
                    className="theme-soft flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm theme-text-soft disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-3">
                      <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      <span>{logoutBusy ? "Logging out..." : "Logout"}</span>
                    </span>
                    <ChevronRight className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="theme-app-shell-subrow relative z-10 w-full px-3 pb-3 md:px-4 lg:px-5">
          <nav ref={navRef} className="relative flex items-center justify-center gap-6 text-sm theme-text-muted">
            <div className="flex w-full items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  isHomeActive ? "theme-nav-button-active" : "theme-nav-button"
                }`}
              >
                <Home className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
              <form
                className="theme-search-shell flex h-11 flex-1 items-center rounded-full px-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch();
                }}
              >
                <Search className="theme-search-action h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="theme-search-input ml-2 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Search beats"
                />
              </form>
              <button
                type="button"
                onClick={() => {
                  setPinnedMenuOpen("Browse");
                  setHoverMenuOpen("Browse");
                  router.push("/activity");
                }}
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-3 text-sm transition ${
                  isBrowseActive || openMenuKey === "Browse" ? "theme-nav-button-active" : "theme-nav-button"
                }`}
              >
                <Compass className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                Browse
              </button>
            </div>

            {startSellingError ? <p className="ml-auto text-xs text-[#ff8f7d]">{startSellingError}</p> : null}

            {notificationsOpen ? (
              <div ref={notificationsPanelRef} onMouseLeave={() => setNotificationsOpen(false)} className={`theme-menu absolute right-0 top-[46px] ${notificationsPanelZClass} w-[min(340px,calc(100vw-1.5rem))] rounded-2xl p-4 backdrop-blur-xl`}>
                <p className="text-sm font-semibold theme-text-main">Notifications</p>
                {notificationsLoading ? <p className="mt-3 text-xs theme-text-muted">Loading notifications...</p> : null}
                {!notificationsLoading && notifications.length === 0 ? <p className="mt-3 text-xs theme-text-muted">No notifications yet.</p> : null}
                {!notificationsLoading ? (
                  <div className="mt-3 space-y-2">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void handleNotificationSelect(item)}
                        className={`theme-soft block w-full rounded-xl px-3 py-3 text-left ${item.is_read ? "opacity-75" : "ring-1 ring-[#ff4d6d]/40"}`}
                      >
                        <p className="text-sm theme-text-soft">{item.message}</p>
                        <p className="mt-1 text-[11px] theme-text-faint">
                          {new Date(item.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>
        </div>
      </header>

      {messagesOpen ? (
        <>
          <div
            className={`theme-overlay fixed inset-x-0 bottom-0 ${messagesOverlayZClass}`}
            style={{ top: `calc(var(--app-header-height) + 0.25rem)` }}
            aria-hidden="true"
          />
          <section
            className={`messages-drawer theme-floating fixed left-3 right-3 ${messagesPanelZClass} flex flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.46)] md:left-4 md:right-4 lg:left-5 lg:right-5`}
            style={{ top: `calc(var(--app-header-height) + 0.5rem)`, height: "min(78vh, 760px)" }}
          >
          <div className="messages-drawer-header flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] theme-text-faint">Messages</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs theme-text-soft">{conversations.length} chats</span>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="messages-drawer-sidebar flex min-h-0 flex-col border-b border-white/10 bg-[#0d1015]/92 lg:border-b-0 lg:border-r lg:border-white/10">
              <div className="messages-drawer-sidebar-head border-b border-white/10 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] theme-text-faint">Inbox</p>
                    <p className="mt-1 text-sm theme-text-muted">Open a collaboration to continue the chat.</p>
                  </div>
                  {unreadMessagesCount > 0 ? (
                    <span className="rounded-full bg-[#ff4d6d] px-2.5 py-1 text-[11px] font-medium text-white">{unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}</span>
                  ) : (
                    <span className="rounded-full bg-[#1ed760]/12 px-2.5 py-1 text-[11px] font-medium text-[#9ef0b5]">{sortedConversations.length}</span>
                  )}
                </div>
                <div className="messages-drawer-search mt-4 flex h-11 items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm theme-text-muted">
                  <Search className="messages-drawer-search-icon h-4 w-4 text-white/45" strokeWidth={1.8} aria-hidden="true" />
                  <span className="ml-3">Search accepted chats</span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {messagesLoading ? <p className="px-4 py-4 text-sm theme-text-muted">Loading conversations...</p> : null}
                {!messagesLoading && conversations.length === 0 ? (
                  <div className="mx-4 my-4 rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm leading-6 theme-text-muted">
                    Accepted offers will show up here and then this list will behave like a real chat inbox.
                  </div>
                ) : null}
                {!messagesLoading && sortedConversations.map((conversation) => {
                  const otherParticipant = conversation.participant_details.find((participant) => participant.id !== user?.id);
                  const latest = getLatestMessage(conversation);
                  const isActive = conversation.id === selectedConversationId;
                  const title = otherParticipant?.username || "Conversation";
                  const initials = title.slice(0, 1).toUpperCase();
                  const unread = isConversationUnread(conversation, user?.id, seenMessageMap);
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`messages-drawer-row flex w-full items-start gap-3 border-b border-white/6 px-4 py-4 text-left transition ${
                        isActive ? "messages-drawer-row-active bg-[#182329]" : "bg-transparent hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="relative">
                        <div className={`messages-drawer-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          isActive ? "messages-drawer-avatar-active bg-[#1ed760] text-[#07140b]" : "bg-white/[0.07] text-white"
                        }`}>
                          {initials}
                        </div>
                        {unread ? <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#0d1015] bg-[#ff4d6d]" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">{title}</p>
                              {unread ? <span className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-[#ff4d6d] px-1.5 py-0.5 text-[10px] font-semibold text-white">1</span> : null}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] theme-text-faint">{conversation.project_title || "Direct collaboration chat"}</p>
                          </div>
                          <p className={`shrink-0 text-[11px] ${isActive ? "text-[#9ef0b5]" : unread ? "text-[#ff9daf]" : "theme-text-faint"}`}>
                            {latest
                              ? new Date(latest.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : new Date(conversation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className={`mt-2 truncate text-sm ${isActive ? "text-white/88" : unread ? "text-white" : "theme-text-muted"}`}>
                          {latest?.content || (latest?.attachments.length ? `${latest.attachments.length} attachment${latest.attachments.length > 1 ? "s" : ""}` : "No messages yet.")}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="messages-drawer-thread flex min-h-0 flex-col bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_30%),linear-gradient(180deg,#11161d_0%,#0d1117_100%)]">
              {selectedConversation ? (
                <>
                  <div className="messages-drawer-thread-head flex items-center gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                    <div className="messages-drawer-thread-avatar flex h-11 w-11 items-center justify-center rounded-full bg-[#20323a] text-sm font-semibold text-white">
                      {(selectedConversationPartner?.username || "C").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold theme-text-main">{selectedConversationPartner?.username || "Collaboration"}</h3>
                      <p className="truncate text-xs theme-text-muted">{selectedConversation.project_title || "Shared project conversation"}</p>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
                    <div className="mx-auto flex max-w-4xl flex-col gap-3">
                      {selectedConversation.messages.length > 0 ? selectedConversation.messages.map((item) => {
                        const mine = item.sender === user?.id;
                        return (
                          <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`messages-drawer-bubble max-w-[85%] rounded-[22px] px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.18)] ${
                                mine ? "messages-drawer-bubble-own rounded-br-md bg-[#005c4b] text-white" : "messages-drawer-bubble-other rounded-bl-md bg-[#202c33] text-white"
                              }`}
                            >
                              <p className={`text-[10px] font-medium uppercase tracking-[0.18em] ${mine ? "text-white/55" : "text-white/42"}`}>
                                {item.sender_username || "User"}
                              </p>
                              {item.content ? <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">{item.content}</p> : null}
                              {item.attachments.length > 0 ? (
                                <div className="mt-2 flex flex-col gap-2">
                                  {item.attachments.map((attachment) => {
                                    const Icon = getMessageAttachmentIcon(attachment);
                                    return (
                                      <a
                                        key={attachment.id}
                                        href={resolveMediaUrl(attachment.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`messages-drawer-attachment flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs transition ${mine ? "border-white/15 bg-white/10 hover:bg-white/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                                      >
                                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                                        <span className="min-w-0 flex-1 truncate">{attachment.original_name}</span>
                                        <span className="shrink-0 text-white/55">{formatAttachmentSize(attachment.size)}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              ) : null}
                              <p className={`mt-2 text-[11px] ${mine ? "text-white/60" : "text-white/45"}`}>
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm theme-text-muted">
                          This chat is unlocked. Send the first message.
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSendMessage} className="messages-drawer-compose border-t border-white/10 bg-[#10151b] px-4 py-4 sm:px-5">
                    {pendingMessageFiles.length > 0 ? (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {pendingMessageFiles.map((file) => {
                          const Icon = getMessageAttachmentIcon(file);
                          return (
                            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="messages-drawer-file-chip flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/85">
                              <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                              <span className="max-w-[12rem] truncate">{file.name}</span>
                              <span className="text-white/45">{formatAttachmentSize(file.size)}</span>
                              <button type="button" onClick={() => removePendingMessageFile(file)} className="text-white/55 transition hover:text-white" aria-label={`Remove ${file.name}`}>
                                <X className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="messages-drawer-compose-box flex items-end gap-3 rounded-[26px] border border-white/10 bg-white/[0.04] p-2 pl-3">
                      <button
                        type="button"
                        onClick={() => messageAttachmentInputRef.current?.click()}
                        className="messages-drawer-attach-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/75 transition hover:bg-white/[0.09] hover:text-white"
                        aria-label="Attach file"
                        title="Attach file"
                      >
                        <Paperclip className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                      </button>
                      <input
                        ref={messageAttachmentInputRef}
                        type="file"
                        multiple
                        accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z,.ppt,.pptx,.xls,.xlsx"
                        className="hidden"
                        onChange={handleMessageAttachmentChange}
                      />
                      <textarea
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        onKeyDown={handleMessageComposerKeyDown}
                        placeholder="Type a message"
                        className="messages-drawer-textarea min-h-[56px] flex-1 resize-none bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/40"
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || (!messageDraft.trim() && pendingMessageFiles.length === 0)}
                        className="messages-drawer-send inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1ed760] text-[#07140b] transition disabled:opacity-60"
                        aria-label={sendingMessage ? "Sending message" : "Send message"}
                      >
                        <Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] theme-text-faint">Enter sends the message, Shift+Enter adds a new line, and the paperclip supports images, audio, and documents.</p>
                  </form>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] theme-text-faint">No chat selected</p>
                  <h3 className="mt-3 text-2xl font-semibold theme-text-main">Choose a conversation from the left</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 theme-text-muted">This panel now behaves more like WhatsApp: list on the left, active chat on the right, and it opens as a wide overlay below the header.</p>
                </div>
              )}

              {messagesError ? <p className="px-4 pb-4 text-sm text-[#ffb4a9] sm:px-5">{messagesError}</p> : null}
            </div>
          </div>
          </section>
        </>
      ) : null}

      {artistEditorOpen ? (
        <div className="theme-overlay fixed inset-0 z-[125] flex items-start justify-center overflow-y-auto px-4 py-8 backdrop-blur-sm" onClick={() => setArtistEditorOpen(false)}>
          <section className="theme-floating w-full max-w-xl rounded-[30px] p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="theme-text-faint text-xs uppercase tracking-[0.18em]">Artist settings</p>
                <h2 className="theme-text-main mt-2 text-2xl font-semibold">Edit profile</h2>
                <p className="theme-text-muted mt-2 text-sm leading-6">Update the artist name and avatar shown in the header dropdown.</p>
              </div>
              <button type="button" onClick={() => setArtistEditorOpen(false)} className="theme-soft rounded-full px-3 py-2 text-xs theme-text-soft">
                Close
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#1c1722] text-2xl font-semibold text-white">
                {artistProfileAvatarPreview ? (
                  <img src={artistProfileAvatarPreview} alt={artistProfileName || user?.username || "Artist"} className="h-full w-full object-cover" />
                ) : (
                  (artistProfileName || user?.username || "A").slice(0, 1).toUpperCase()
                )}
              </div>
              <label className="theme-soft cursor-pointer rounded-2xl px-4 py-3 text-sm theme-text-soft">
                {artistProfileAvatar ? `Selected image: ${artistProfileAvatar.name}` : "Choose profile photo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleArtistAvatarChange} />
              </label>
            </div>

            <label className="mt-6 block text-sm theme-text-soft">
              <span className="theme-text-faint mb-2 block text-xs uppercase tracking-[0.18em]">Artist name</span>
              <input
                value={artistProfileName}
                onChange={(event) => setArtistProfileName(event.target.value)}
                className="theme-input h-11 w-full rounded-2xl px-4 text-sm outline-none"
                placeholder="Enter artist name"
              />
            </label>

            {artistProfileError ? <p className="mt-4 text-sm text-[#ff9b87]">{artistProfileError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setArtistEditorOpen(false)} className="theme-soft rounded-full px-5 py-2.5 text-sm theme-text-soft">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveArtistProfile()}
                disabled={artistProfileSaving}
                className="rounded-full bg-gradient-to-r from-[#8b28ff] via-[#7b32ff] to-[#4b7dff] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {artistProfileSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {uploadPickerOpen ? (
        <div
          className="theme-overlay fixed inset-0 z-[120] flex items-start justify-center px-4 pt-28 backdrop-blur-sm"
          onClick={() => setUploadPickerOpen(false)}
        >
          <section
            className="theme-floating w-full max-w-[860px] rounded-2xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold theme-text-main">Upload</h2>
              <button
                type="button"
                onClick={() => setUploadPickerOpen(false)}
                className="theme-soft rounded-md px-2 py-1 text-xs theme-text-soft"
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/upload-wizard?flow=beat&fresh=1");
                }}
                className="theme-soft rounded-2xl p-6 text-left transition"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#8b28ff] to-[#601dff] text-2xl">
                  B
                </div>
                <h3 className="text-3xl font-semibold leading-none tracking-tight theme-text-main">Upload Beat</h3>
                <p className="mt-3 text-sm theme-text-muted">Get paid by selling beats to 100K+ artists worldwide.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/upload-wizard?flow=kit&fresh=1");
                }}
                className="theme-soft rounded-2xl p-6 text-left transition"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1f77ff] to-[#1550ff] text-2xl">
                  K
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-3xl font-semibold leading-none tracking-tight theme-text-main">Upload Sound</h3>
                  <span className="rounded-full border border-[#ffcf7a]/40 bg-[#ff9f1c]/18 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#ffd58c]">
                    New
                  </span>
                </div>
                <p className="mt-3 text-sm theme-text-muted">
                  Get paid by selling sound kits to musicians across the globe.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUploadPickerOpen(false);
                  router.push("/producer/media-uploads");
                }}
                className="theme-soft rounded-2xl p-6 text-left transition"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#f6b067] to-[#ff8a38] text-2xl text-[#20150e]">M</div>
                <h3 className="text-3xl font-semibold leading-none tracking-tight theme-text-main">Media Uploads</h3>
                <p className="mt-3 text-sm theme-text-muted">Open saved drafts, continue editing, or remove old uploads.</p>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {globalFlash ? (
        <div className="pointer-events-none fixed left-1/2 top-24 z-[160] w-full max-w-[720px] -translate-x-1/2 px-4">
          <div className="rounded-[24px] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(10,24,20,0.96),rgba(20,56,44,0.96))] px-6 py-5 text-center shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/75">Upload Complete</p>
            <p className="mt-2 text-2xl font-semibold text-white">{globalFlash}</p>
          </div>
        </div>
      ) : null}
      <main
        className={
          isOrdersRoute || isActivityRoute
            ? "flex min-h-0 flex-1 w-full overflow-hidden px-3 pb-6 md:px-4 lg:px-5"
            : "w-full px-3 pb-24 md:px-4 lg:px-5"
        }
      >
        {children}
      </main>
      {!hideGlobalPlayer ? <GlobalPlayer /> : null}
    </div>
  );
}

