import { Skeleton } from "@/components/skeleton";

export function BeatListRowSkeleton() {
  return (
    <article className="theme-soft rounded-[22px] border px-3 py-3">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Skeleton className="mt-1 h-11 w-11 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-2xl" />

          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-6 w-40 max-w-full rounded-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-2 xl:justify-end">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}
