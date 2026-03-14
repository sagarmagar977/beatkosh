import { apiRequest } from "@/lib/api";

export type ReferenceScreen = {
  id: number;
  slug: string;
  role: "artist" | "producer";
  title: string;
  file_name: string;
  category: string;
  tags: string[];
  relative_path: string;
  image_url: string;
};

export type FeatureTrack = {
  key: string;
  title: string;
  status: "live" | "in_progress" | "planned";
  frontend_route: string;
  backend_dependencies: string[];
};

export type Beat22Summary = {
  reference_name: string;
  reference_root: string;
  roles: {
    artist: { screen_count: number; screens: ReferenceScreen[] };
    producer: { screen_count: number; screens: ReferenceScreen[] };
  };
  totals: {
    screens: number;
    categories: Record<string, number>;
  };
  feature_map: {
    artist: FeatureTrack[];
    producer: FeatureTrack[];
  };
};

export async function fetchBeat22Summary() {
  return apiRequest<Beat22Summary>("/reference/beat22/");
}

export function toProxyImageUrl(imageUrl: string) {
  if (imageUrl.startsWith("/api/")) {
    return `/backend${imageUrl}`;
  }
  return imageUrl;
}
