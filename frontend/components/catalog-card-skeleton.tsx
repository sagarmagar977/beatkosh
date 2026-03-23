import { Skeleton } from "@/components/skeleton";

export function CatalogCardSkeleton() {
  return (
    <article className="app-card p-3">
      <Skeleton className="h-24 w-full rounded-md" />
      <Skeleton className="mt-3 h-5 w-3/4 rounded-full" />
      <Skeleton className="mt-2 h-4 w-1/2 rounded-full" />
      <Skeleton className="mt-3 h-10 w-full rounded-xl" />
      <Skeleton className="mt-3 h-10 w-full rounded-xl" />
    </article>
  );
}
