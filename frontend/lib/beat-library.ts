"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type SavedBeatEntry = {
  id: number;
  producer: number;
  title: string;
  producer_username: string;
  genre: string;
  bpm: number;
  key?: string | null;
  mood?: string | null;
  base_price: string;
  cover_art_obj?: string | null;
  tag_names?: string[];
};

export type SavedPlaylist = {
  id: string;
  name: string;
  beats: SavedBeatEntry[];
  created_at: string;
  updated_at: string;
};

type BeatLibraryState = {
  listenLater: SavedBeatEntry[];
  playlists: SavedPlaylist[];
};

type SaveBeatCollectionsPayload = {
  includeListenLater: boolean;
  playlistIds: string[];
  newPlaylistName?: string;
};

const STORAGE_PREFIX = "beatkosh-beat-library-v1";
const LIBRARY_EVENT = "beatkosh-library-updated";

const defaultState: BeatLibraryState = {
  listenLater: [],
  playlists: [],
};

const snapshotCache = new Map<string, { raw: string | null; state: BeatLibraryState }>();

function getStorageKey(userId: number) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function sanitizeState(raw: unknown): BeatLibraryState {
  if (!raw || typeof raw !== "object") {
    return defaultState;
  }
  const candidate = raw as Partial<BeatLibraryState>;
  return {
    listenLater: Array.isArray(candidate.listenLater) ? candidate.listenLater : [],
    playlists: Array.isArray(candidate.playlists) ? candidate.playlists : [],
  };
}

function getCachedState(cacheKey: string, raw: string | null) {
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.raw === raw) {
    return cached.state;
  }

  const state = raw ? sanitizeState(JSON.parse(raw)) : defaultState;
  snapshotCache.set(cacheKey, { raw, state });
  return state;
}

function readLibraryState(userId?: number | null): BeatLibraryState {
  if (!userId || typeof window === "undefined") {
    return defaultState;
  }
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    return getCachedState(getStorageKey(userId), raw);
  } catch {
    return defaultState;
  }
}

function writeLibraryState(userId: number, state: BeatLibraryState) {
  if (typeof window === "undefined") {
    return;
  }
  const key = getStorageKey(userId);
  const raw = JSON.stringify(state);
  snapshotCache.set(key, { raw, state });
  window.localStorage.setItem(key, raw);
  window.dispatchEvent(new CustomEvent(LIBRARY_EVENT, { detail: { userId } }));
}

function subscribeToLibrary(userId: number | null | undefined, onChange: () => void) {
  if (!userId || typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event?: Event) => {
    if (event instanceof CustomEvent && event.detail?.userId && event.detail.userId !== userId) {
      return;
    }
    onChange();
  };

  window.addEventListener("storage", handler);
  window.addEventListener(LIBRARY_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(LIBRARY_EVENT, handler as EventListener);
  };
}

function upsertBeat(list: SavedBeatEntry[], beat: SavedBeatEntry) {
  const next = list.filter((item) => item.id !== beat.id);
  next.unshift(beat);
  return next;
}

function removeBeat(list: SavedBeatEntry[], beatId: number) {
  return list.filter((item) => item.id !== beatId);
}

function normalizePlaylistName(value?: string) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function useBeatLibrary(userId?: number | null) {
  const subscribe = useCallback((onChange: () => void) => subscribeToLibrary(userId, onChange), [userId]);
  const getSnapshot = useCallback(() => readLibraryState(userId), [userId]);

  const state = useSyncExternalStore(subscribe, getSnapshot, () => defaultState);

  const updateState = useCallback(
    (updater: (current: BeatLibraryState) => BeatLibraryState) => {
      if (!userId) {
        return;
      }
      const next = updater(readLibraryState(userId));
      writeLibraryState(userId, next);
    },
    [userId],
  );

  const addToListenLater = useCallback(
    (beat: SavedBeatEntry) => {
      updateState((current) => ({
        ...current,
        listenLater: upsertBeat(current.listenLater, beat),
      }));
    },
    [updateState],
  );

  const removeFromListenLater = useCallback(
    (beatId: number) => {
      updateState((current) => ({
        ...current,
        listenLater: removeBeat(current.listenLater, beatId),
      }));
    },
    [updateState],
  );

  const saveBeatCollections = useCallback(
    (beat: SavedBeatEntry, payload: SaveBeatCollectionsPayload) => {
      updateState((current) => {
        const includeListenLater = Boolean(payload.includeListenLater);
        const playlistIds = new Set(payload.playlistIds);
        const newPlaylistName = normalizePlaylistName(payload.newPlaylistName);
        const now = new Date().toISOString();

        const nextPlaylists = current.playlists.map((playlist) => {
          const shouldInclude = playlistIds.has(playlist.id);
          const beats = shouldInclude ? upsertBeat(playlist.beats, beat) : removeBeat(playlist.beats, beat.id);
          return { ...playlist, beats, updated_at: now };
        });

        if (newPlaylistName) {
          const existing = nextPlaylists.find((playlist) => playlist.name.toLowerCase() === newPlaylistName.toLowerCase());
          if (existing) {
            existing.beats = upsertBeat(existing.beats, beat);
            existing.updated_at = now;
          } else {
            nextPlaylists.unshift({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: newPlaylistName,
              beats: [beat],
              created_at: now,
              updated_at: now,
            });
          }
        }

        return {
          listenLater: includeListenLater ? upsertBeat(current.listenLater, beat) : removeBeat(current.listenLater, beat.id),
          playlists: nextPlaylists,
        };
      });
    },
    [updateState],
  );

  const removeBeatFromPlaylist = useCallback(
    (playlistId: string, beatId: number) => {
      updateState((current) => ({
        ...current,
        playlists: current.playlists.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, beats: removeBeat(playlist.beats, beatId), updated_at: new Date().toISOString() }
            : playlist,
        ),
      }));
    },
    [updateState],
  );

  const createPlaylist = useCallback(
    (name: string) => {
      const playlistName = normalizePlaylistName(name);
      if (!playlistName) {
        return;
      }
      updateState((current) => {
        if (current.playlists.some((playlist) => playlist.name.toLowerCase() === playlistName.toLowerCase())) {
          return current;
        }
        const now = new Date().toISOString();
        return {
          ...current,
          playlists: [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: playlistName,
              beats: [],
              created_at: now,
              updated_at: now,
            },
            ...current.playlists,
          ],
        };
      });
    },
    [updateState],
  );

  const isInListenLater = useCallback(
    (beatId: number) => state.listenLater.some((item) => item.id === beatId),
    [state.listenLater],
  );

  const getPlaylistMembership = useCallback(
    (beatId: number) => state.playlists.filter((playlist) => playlist.beats.some((item) => item.id === beatId)).map((playlist) => playlist.id),
    [state.playlists],
  );

  return useMemo(
    () => ({
      listenLater: state.listenLater,
      playlists: state.playlists,
      addToListenLater,
      removeFromListenLater,
      saveBeatCollections,
      removeBeatFromPlaylist,
      createPlaylist,
      isInListenLater,
      getPlaylistMembership,
    }),
    [
      addToListenLater,
      createPlaylist,
      getPlaylistMembership,
      isInListenLater,
      removeBeatFromPlaylist,
      removeFromListenLater,
      saveBeatCollections,
      state.listenLater,
      state.playlists,
    ],
  );
}
