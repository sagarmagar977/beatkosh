"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type PlayerTrack = {
  id: number;
  title: string;
  artist: string;
  bpm?: number | null;
  key?: string | null;
  genre?: string;
  price?: string;
  coverText?: string;
  audioUrl: string;
};

type PlayerContextType = {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: PlayerTrack) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (time: number) => void;
  setVolumeLevel: (value: number) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = 0.8;
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

  const playTrack = async (track: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
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

  const togglePlay = async () => {
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
    currentTime,
    duration,
    volume,
    playTrack,
    togglePlay,
    seekTo,
    setVolumeLevel,
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
