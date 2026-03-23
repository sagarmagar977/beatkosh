"use client";

import { Skeleton } from "@/components/skeleton";

function HeaderShell() {
  return (
    <header className="theme-header fixed inset-x-0 top-0 z-[110] isolate border-b shadow-[0_14px_34px_rgba(0,0,0,0.32)]" style={{ borderColor: "var(--line)" }}>
      <div className="absolute inset-0 -z-10 bg-[#17131b]" aria-hidden="true" />
      <div className="relative z-10 flex w-full items-center gap-3 bg-[#17131b] px-3 py-3 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-5 md:px-4 lg:px-5">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="hidden md:block">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="hidden h-10 w-10 rounded-full md:block" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      <div className="relative z-10 w-full bg-[#17131b] px-3 pb-3 md:px-4 lg:px-5">
        <div className="flex items-center gap-2 md:hidden">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function RailCardSkeleton() {
  return (
    <div className="w-[190px] flex-none rounded-[22px] border border-white/8 bg-white/[0.03] p-3">
      <Skeleton className="aspect-square w-full rounded-[18px]" />
      <Skeleton className="mt-3 h-4 w-3/4 rounded-full" />
      <Skeleton className="mt-2 h-3 w-1/2 rounded-full" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-14 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3 w-4/5 rounded-full" />
    </div>
  );
}

function ShelfSkeleton() {
  return (
    <section className="rounded-[30px] border border-white/8 bg-[#111315]/94 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-8 w-52 rounded-full" />
          <Skeleton className="h-4 w-72 rounded-full" />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden pb-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <RailCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

export function AppBootSkeleton() {
  return (
    <div className="app-theme min-h-screen pb-28 pt-[112px] md:pt-[124px]">
      <HeaderShell />
      <main className="w-full px-3 py-6 md:px-4 lg:px-5">
        <div className="space-y-4 pb-24">
          <section className="pt-1">
            <Skeleton className="h-16 w-[18rem] max-w-full rounded-[28px] md:h-20 md:w-[26rem]" />
            <Skeleton className="mt-3 h-16 w-[14rem] max-w-full rounded-[28px] md:h-20 md:w-[18rem]" />
          </section>
          <ShelfSkeleton />
          <ShelfSkeleton />
          <ShelfSkeleton />
        </div>
      </main>
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="space-y-4 pb-24">
      <section className="pt-1">
        <Skeleton className="h-16 w-[18rem] max-w-full rounded-[28px] md:h-20 md:w-[26rem]" />
        <Skeleton className="mt-3 h-16 w-[14rem] max-w-full rounded-[28px] md:h-20 md:w-[18rem]" />
      </section>
      <ShelfSkeleton />
      <ShelfSkeleton />
      <ShelfSkeleton />
      <ShelfSkeleton />
    </div>
  );
}

function CartRowSkeleton() {
  return (
    <article className="theme-soft grid grid-cols-[minmax(0,1.95fr)_190px_170px_96px] items-center gap-4 rounded-[18px] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-40 rounded-full" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-10 w-[142px] rounded-lg" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-center gap-2.5">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </article>
  );
}

export function OrdersPageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <section>
        <Skeleton className="h-10 w-40 rounded-full" />
      </section>
      <section className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1.72fr)_320px]">
        <div className="theme-surface flex min-h-0 flex-col overflow-hidden rounded-[28px] p-5 xl:h-full">
          <div className="grid grid-cols-[minmax(0,1.95fr)_190px_170px_96px] gap-4 border-b pb-3" style={{ borderColor: "var(--line)" }}>
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="mx-auto h-3 w-16 rounded-full" />
            <Skeleton className="mx-auto h-3 w-16 rounded-full" />
            <Skeleton className="mx-auto h-3 w-16 rounded-full" />
          </div>
          <div className="space-y-4 pt-4 pr-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <CartRowSkeleton key={index} />
            ))}
          </div>
        </div>
        <aside className="theme-surface h-fit self-start rounded-[24px] p-4">
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-[30px] border border-white/8 bg-white/[0.03] p-6 shadow-[0_24px_60px_rgba(3,3,8,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-4">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-4 w-3/4 rounded-full" />
    </div>
  );
}

export function ProducerStudioSkeleton() {
  return (
    <div className="grid gap-6 pb-10 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="xl:app-sidebar-sticky">
        <div className="overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,#140f1e_0%,#0d0a15_100%)] p-5 shadow-[0_26px_70px_rgba(6,4,12,0.34)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-5 w-40 rounded-full" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full rounded-full" />
          <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-28 rounded-full" />
                      <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-11/12 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="surface-panel rounded-[32px] p-6">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="mt-3 h-10 w-72 rounded-full" />
            <Skeleton className="mt-3 h-4 w-full rounded-full" />
            <Skeleton className="mt-2 h-4 w-3/4 rounded-full" />
            <div className="mt-6 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-white/10 bg-[#0d0a14] p-4">
                  <Skeleton className="h-5 w-40 rounded-full" />
                  <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="surface-panel rounded-[32px] p-6">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="mt-3 h-10 w-48 rounded-full" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-[24px]" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
