"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { apiRequest } from "@/lib/api";

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
  id: number;
  name: string;
  beats: SavedBeatEntry[];
  created_at: string;
  updated_at: string;
};

type BeatLibraryState = {
  listenLater: SavedBeatEntry[];
  playlists: SavedPlaylist[];
  loading: boolean;
};

type SaveBeatCollectionsPayload = {
  includeListenLater: boolean;
  playlistIds: number[];
  newPlaylistName?: string;
};

const defaultState: BeatLibraryState = {
  listenLater: [],
  playlists: [],
  loading: false,
};

type LibraryStore = {
  state: BeatLibraryState;
  listeners: Set<() => void>;
  inflight?: Promise<void>;
};

const stores = new Map<number, LibraryStore>();

function getStore(userId?: number | null) {
  if (!userId) {
    return null;
  }
  let store = stores.get(userId);
  if (!store) {
    store = { state: defaultState, listeners: new Set() };
    stores.set(userId, store);
  }
  return store;
}

function emit(userId?: number | null) {
  const store = getStore(userId);
  if (!store) {
    return;
  }
  store.listeners.forEach((listener) => listener());
}

function setState(userId: number, next: BeatLibraryState) {
  const store = getStore(userId);
  if (!store) {
    return;
  }
  store.state = next;
  emit(userId);
}

async function fetchLibrary(userId: number, token: string) {
  const payload = await apiRequest<{ listen_later: SavedBeatEntry[]; playlists: SavedPlaylist[] }>("/account/library/me/", { token });
  setState(userId, {
    listenLater: Array.isArray(payload.listen_later) ? payload.listen_later : [],
    playlists: Array.isArray(payload.playlists) ? payload.playlists : [],
    loading: false,
  });
}

async function refreshLibrary(userId?: number | null, token?: string | null) {
  if (!userId || !token) {
    return;
  }
  const store = getStore(userId);
  if (!store) {
    return;
  }
  if (store.inflight) {
    return store.inflight;
  }
  store.state = { ...store.state, loading: true };
  emit(userId);
  store.inflight = fetchLibrary(userId, token).finally(() => {
    const current = getStore(userId);
    if (current) {
      current.inflight = undefined;
    }
  });
  return store.inflight;
}

function subscribeToLibrary(userId: number | null | undefined, onChange: () => void) {
  const store = getStore(userId);
  if (!store) {
    return () => undefined;
  }
  store.listeners.add(onChange);
  return () => {
    store.listeners.delete(onChange);
  };
}

export function useBeatLibrary(userId?: number | null, token?: string | null) {
  const subscribe = useCallback((onChange: () => void) => subscribeToLibrary(userId, onChange), [userId]);
  const getSnapshot = useCallback(() => getStore(userId)?.state ?? defaultState, [userId]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => defaultState);

  useEffect(() => {
    void refreshLibrary(userId, token);
  }, [userId, token]);

  const addToListenLater = useCallback(
    async (beat: SavedBeatEntry) => {
      if (!token) {
        return;
      }
      await apiRequest("/account/library/listen-later/" + beat.id + "/", { method: "POST", token, body: {} });
      await refreshLibrary(userId, token);
    },
    [token, userId],
  );

  const removeFromListenLater = useCallback(
    async (beatId: number) => {
      if (!token) {
        return;
      }
      await apiRequest("/account/library/listen-later/" + beatId + "/", { method: "DELETE", token });
      await refreshLibrary(userId, token);
    },
    [token, userId],
  );

  const saveBeatCollections = useCallback(
    async (beat: SavedBeatEntry, payload: SaveBeatCollectionsPayload) => {
      if (!token) {
        return;
      }
      await apiRequest("/account/library/beats/" + beat.id + "/collections/", {
        method: "POST",
        token,
        body: {
          include_listen_later: payload.includeListenLater,
          playlist_ids: payload.playlistIds,
          new_playlist_name: payload.newPlaylistName ?? "",
        },
      });
      await refreshLibrary(userId, token);
    },
    [token, userId],
  );

  const removeBeatFromPlaylist = useCallback(
    async (playlistId: number, beatId: number) => {
      if (!token) {
        return;
      }
      await apiRequest("/account/library/playlists/" + playlistId + "/beats/" + beatId + "/", { method: "DELETE", token });
      await refreshLibrary(userId, token);
    },
    [token, userId],
  );

  const createPlaylist = useCallback(
    async (name: string) => {
      if (!token) {
        return;
      }
      const cleaned = name.trim().replace(/\s+/g, " ");
      if (!cleaned) {
        return;
      }
      await apiRequest("/account/library/playlists/", { method: "POST", token, body: { name: cleaned } });
      await refreshLibrary(userId, token);
    },
    [token, userId],
  );

  const isInListenLater = useCallback((beatId: number) => state.listenLater.some((item) => item.id === beatId), [state.listenLater]);
  const getPlaylistMembership = useCallback((beatId: number) => state.playlists.filter((playlist) => playlist.beats.some((item) => item.id === beatId)).map((playlist) => playlist.id), [state.playlists]);

  return useMemo(() => ({
    listenLater: state.listenLater,
    playlists: state.playlists,
    loading: state.loading,
    addToListenLater,
    removeFromListenLater,
    saveBeatCollections,
    removeBeatFromPlaylist,
    createPlaylist,
    isInListenLater,
    getPlaylistMembership,
    refresh: () => refreshLibrary(userId, token),
  }), [addToListenLater, createPlaylist, getPlaylistMembership, isInListenLater, removeBeatFromPlaylist, removeFromListenLater, saveBeatCollections, state.listenLater, state.loading, state.playlists, token, userId]);
}
