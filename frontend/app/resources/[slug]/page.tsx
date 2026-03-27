"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";

type Article = {
  id: number;
  category: "blog" | "tutorial" | "help";
  title: string;
  slug: string;
  summary: string;
  content: string;
  published_at: string;
};

export default function ResourceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setArticle(await apiRequest<Article>(`/resources/articles/${slug}/`));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load article");
      }
    };
    void run();
  }, [slug]);

  return (
    <div className="blog-detail-scope space-y-6">
      <section className="blog-detail-hero surface-panel rounded-[34px] p-6 md:p-8">
        <Link href="/resources" className="blog-detail-back text-sm text-white/70 hover:text-white">Back to resources</Link>
        <p className="mt-4 eyebrow">{article?.category ?? "Article"}</p>
        <h1 className="blog-detail-title mt-2 text-4xl font-semibold tracking-tight">{article?.title ?? "Loading..."}</h1>
        {article?.summary ? <p className="blog-detail-summary mt-3 max-w-3xl text-white/68">{article.summary}</p> : null}
      </section>
      <section className="blog-detail-body surface-panel rounded-[30px] p-6">
        <div className="blog-detail-prose prose max-w-none">
          <p className="whitespace-pre-wrap">{article?.content ?? "No content available."}</p>
        </div>
      </section>
      {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}
