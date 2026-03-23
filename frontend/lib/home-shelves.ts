"use client";

import type { TrendingBeat } from "@/components/trending-beat-shelf";

export type License = {
  id: number;
  name: string;
  is_exclusive?: boolean;
  includes_stems?: boolean;
};

export type HomeBeat = {
  id: number;
  producer: number;
  producer_username: string;
  title: string;
  genre: string;
  beat_type?: string | null;
  mood?: string | null;
  bpm: number;
  key?: string | null;
  base_price: string;
  cover_art_obj?: string | null;
  created_at?: string;
  like_count?: number;
  play_count?: number;
  licenses?: License[];
  tag_names?: string[];
  preview_audio_obj?: string | null;
  audio_file_obj?: string | null;
  storefront_flags?: { free_download?: boolean; stems_available?: boolean; exclusive_available?: boolean };
};

export type ListeningSession = {
  id: number;
  listened_seconds: number;
  completion_percent: number;
  is_completed: boolean;
  is_skipped: boolean;
};

export type ShelfBeatItem = {
  beat: HomeBeat;
  session?: ListeningSession | null;
  note?: string;
};

export type Playlist = {
  id: number;
  name: string;
  beats: HomeBeat[];
  created_at: string;
  updated_at: string;
};

export type Shelf = {
  key: string;
  title: string;
  subtitle?: string;
  see_more_path?: string;
  beats?: ShelfBeatItem[];
  playlists?: Playlist[];
};

export type HomeFeed = {
  greeting: string;
  user_label?: string;
  shelves: Shelf[];
};

export function serializeShelfBeatItems(beats: HomeBeat[]): ShelfBeatItem[] {
  return beats.map((beat) => ({
    beat,
    note: "",
  }));
}

export function sortShelfBeats(items: HomeBeat[]) {
  return [...items].sort((left, right) => {
    const playDiff = (right.play_count ?? 0) - (left.play_count ?? 0);
    if (playDiff !== 0) {
      return playDiff;
    }

    const likeDiff = (right.like_count ?? 0) - (left.like_count ?? 0);
    if (likeDiff !== 0) {
      return likeDiff;
    }

    const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
    const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
    return rightTime - leftTime;
  });
}

export function categoryPathFromKey(key: string) {
  return `/home-category/${key}`;
}

export function buildGenreShelves(beats: HomeBeat[]): Shelf[] {
  const grouped = beats.reduce<Map<string, HomeBeat[]>>((accumulator, beat) => {
    const genre = beat.genre?.trim();
    if (!genre) {
      return accumulator;
    }

    const current = accumulator.get(genre) ?? [];
    current.push(beat);
    accumulator.set(genre, current);
    return accumulator;
  }, new Map());

  return [...grouped.entries()]
    .map(([genre, items]) => {
      const slug = `genre-${genre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const sortedItems = sortShelfBeats(items);
      const score = sortedItems.reduce((total, beat) => total + (beat.play_count ?? 0) + (beat.like_count ?? 0), 0);
      return {
        key: slug,
        title: `${genre} Beats`,
        subtitle: `Fresh ${genre.toLowerCase()} picks from the live catalog.`,
        see_more_path: categoryPathFromKey(slug),
        beats: serializeShelfBeatItems(sortedItems.slice(0, 8)),
        score,
        count: items.length,
      };
    })
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return right.count - left.count;
    })
    .slice(0, 4)
    .map(({ score, count, ...shelf }) => {
      void score;
      void count;
      return shelf;
    });
}

export function withHomeCategoryPaths(shelves: Shelf[]) {
  return shelves.map((shelf) => {
    if (shelf.beats && shelf.beats.length > 0) {
      return {
        ...shelf,
        see_more_path: categoryPathFromKey(shelf.key),
      };
    }
    return shelf;
  });
}

export function trendShelfToBeatItems(beats: TrendingBeat[]): ShelfBeatItem[] {
  return beats.map((item) => ({
    beat: {
      id: item.beat_id,
      producer: item.producer_id,
      producer_username: item.producer_username,
      title: item.title,
      genre: item.genre,
      bpm: item.bpm,
      base_price: item.base_price,
      cover_art_obj: item.cover_art_obj,
      created_at: item.created_at,
      play_count: item.play_count,
      like_count: item.like_count,
      preview_audio_obj: item.preview_audio_obj,
      tag_names: [],
    },
    note: `Rank #${item.rank} trending score ${Math.round(item.trending_score)}`,
  }));
}
