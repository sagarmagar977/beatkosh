"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";

type ResourceArticle = {
  id: number;
  category: "blog" | "tutorial" | "help";
  title: string;
  slug: string;
  summary: string;
  content: string;
};

type FaqItem = {
  id: number;
  question: string;
  answer: string;
};

const categories: Array<ResourceArticle["category"]> = ["blog", "tutorial", "help"];

export default function ResourcesPage() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<ResourceArticle["category"]>("blog");
  const [articles, setArticles] = useState<ResourceArticle[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl === "blog" || fromUrl === "tutorial" || fromUrl === "help") {
      return fromUrl;
    }
    return category;
  }, [category, searchParams]);
  useEffect(() => {
    const run = async () => {
      try {
        const [articleData, faqData] = await Promise.all([
          apiRequest<ResourceArticle[]>(`/resources/articles/?category=${selectedCategory}`),
          apiRequest<FaqItem[]>("/resources/faq/"),
        ]);
        setArticles(articleData);
        setFaq(faqData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load resources");
      }
    };
    void run();
  }, [selectedCategory]);

  return (
    <div className="resources-page-scope space-y-6">
      <section className="resources-page-hero surface-panel rounded-xl p-4">
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="resources-page-copy mt-1 text-sm text-white/60">Live resources feed from backend CMS endpoints.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className={`chip ${item === selectedCategory ? "active" : ""}`}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="resources-page-panel surface-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold capitalize">{selectedCategory} Articles</h2>
          <div className="mt-3 space-y-3">
            {articles.map((article) => (
              <article key={article.id} className="resources-page-card app-card p-3">
                <h3 className="font-semibold">{article.title}</h3>
                <p className="resources-page-copy mt-1 text-sm text-white/60">{article.summary || "No summary available."}</p>
                <Link href={`/resources/${article.slug}`} className="resources-page-link mt-3 inline-block text-xs text-[#b78cff] hover:underline">
                  Read article
                </Link>
              </article>
            ))}
            {articles.length === 0 ? <p className="resources-page-copy text-sm text-white/60">No articles in this category yet.</p> : null}
          </div>
        </div>

        <aside className="resources-page-panel surface-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <div className="mt-3 space-y-2">
            {faq.map((item) => (
              <div key={item.id} className="resources-faq-card app-card p-3">
                <p className="font-medium">{item.question}</p>
                <p className="resources-page-copy mt-1 text-sm text-white/60">{item.answer}</p>
              </div>
            ))}
            {faq.length === 0 ? <p className="resources-page-copy text-sm text-white/60">No FAQ items yet.</p> : null}
          </div>
        </aside>
      </section>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}


