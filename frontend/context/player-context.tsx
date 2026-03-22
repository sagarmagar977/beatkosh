"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import { useAuth } from "@/app/auth-context";

export type PlayerTrack = {
  id: number;
  title: string;
  artist: string;
  bpm?: number | null;
  playCount?: number | null;
  key?: string | null;
  genre?: string;
  mood?: string | null;
  price?: string;
  coverText?: string;
  coverUrl?: string | null;
  beatUrl?: string;
  defaultLicenseId?: number | null;
  audioUrl: string;
};

type PlayTrackOptions = {
  queue?: PlayerTrack[];
  startIndex?: number;
};

type PlayerContextType = {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  isLooping: boolean;
  isShuffling: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  canPlay: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  playTrack: (track: PlayerTrack, options?: PlayTrackOptions) => Promise<void>;
  togglePlay: () => Promise<void>;
  toggleLoop: () => void;
  toggleShuffle: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  seekTo: (time: number) => void;
  setVolumeLevel: (value: number) => void;
  stopPlayback: (clearTrack?: boolean) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

function buildQueueStartIndex(track: PlayerTrack, queue: PlayerTrack[]) {
  const directIndex = queue.findIndex((item) => item.id === track.id);
  return directIndex >= 0 ? directIndex : 0;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const queueIndexRef = useRef(-1);
  const isShufflingRef = useRef(false);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const canPlay = Boolean(token);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    isShufflingRef.current = isShuffling;
  }, [isShuffling]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = 0.8;
    audio.loop = false;
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const stopPlayback = (clearTrack = false) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);

    if (clearTrack) {
      audio.src = "";
      setCurrentTrack(null);
      setDuration(0);
      setQueue([]);
      setQueueIndex(-1);
    }
  };

  useEffect(() => {
    if (loading || canPlay) {
      return;
    }

    const timer = window.setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }
      audio.pause();
      audio.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      audio.src = "";
      setCurrentTrack(null);
      setDuration(0);
      setQueue([]);
      setQueueIndex(-1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [canPlay, loading]);

  const playTrack = async (track: PlayerTrack, options?: PlayTrackOptions) => {
    if (loading) {
      return;
    }
    if (!canPlay) {
      stopPlayback(true);
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (options?.queue && options.queue.length > 0) {
      const nextQueue = options.queue;
      const startIndex = typeof options.startIndex === "number" ? options.startIndex : buildQueueStartIndex(track, nextQueue);
      setQueue(nextQueue);
      setQueueIndex(startIndex);
    } else if (queueRef.current.length === 0 || !queueRef.current.some((item) => item.id === track.id)) {
      setQueue([track]);
      setQueueIndex(0);
    }

    const switchingTrack = currentTrack?.id !== track.id || audio.src !== track.audioUrl;
    if (switchingTrack) {
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(0);
      audio.src = track.audioUrl;
      audio.currentTime = 0;
    }

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const playByIndex = async (nextIndex: number) => {
    const nextTrack = queueRef.current[nextIndex];
    if (!nextTrack) {
      return;
    }
    setQueueIndex(nextIndex);
    await playTrack(nextTrack, { queue: queueRef.current, startIndex: nextIndex });
  };

  const playNext = async () => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) {
      return;
    }
    if (isShufflingRef.current && currentQueue.length > 1) {
      const candidates = currentQueue.map((_, index) => index).filter((index) => index !== queueIndexRef.current);
      const randomIndex = candidates[Math.floor(Math.random() * candidates.length)];
      await playByIndex(randomIndex);
      return;
    }
    const nextIndex = queueIndexRef.current + 1;
    if (nextIndex >= currentQueue.length) {
      return;
    }
    await playByIndex(nextIndex);
  };

  const playPrevious = async () => {
    const previousIndex = queueIndexRef.current - 1;
    if (previousIndex < 0) {
      return;
    }
    await playByIndex(previousIndex);
  };

  const togglePlay = async () => {
    if (loading) {
      return;
    }
    if (!canPlay) {
      stopPlayback(true);
      return;
    }

    const audio = audioRef.current;
    if (!audio || !currentTrack) {
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }
    audio.pause();
  };

  const toggleLoop = () => {
    setIsLooping((prev) => !prev);
  };

  const toggleShuffle = () => {
    setIsShuffling((prev) => !prev);
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const next = clamp(time, 0, duration || 0);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const setVolumeLevel = (value: number) => {
    const next = clamp(value, 0, 1);
    setVolume(next);
    if (audioRef.current) {
      audioRef.current.volume = next;
    }
  };

  const value = {
    currentTrack,
    isPlaying,
    isLooping,
    isShuffling,
    currentTime,
    duration,
    volume,
    canPlay,
    hasNext: queueIndex >= 0 && queueIndex < queue.length - 1,
    hasPrevious: queueIndex > 0,
    playTrack,
    togglePlay,
    toggleLoop,
    toggleShuffle,
    playNext,
    playPrevious,
    seekTo,
    setVolumeLevel,
    stopPlayback,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}
