"use client";

import { BeatsExplorePage } from "@/app/beats-explore";

export default function Page() {
  return <BeatsExplorePage title="Pop Beats" endpoint="/beats/" genreFilter="Pop" />;
}
