"use client";

import { BeatsExplorePage } from "@/app/beats-explore";

export default function Page() {
  return <BeatsExplorePage title="Trending Beats" endpoint="/beats/trending/" />;
}
