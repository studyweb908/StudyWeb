import React from 'react';

export const HeroSkeleton = () => (
  <div className="relative rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm h-full flex flex-col md:flex-row items-stretch p-6 gap-6 md:gap-8 animate-pulse">
    <div className="max-w-xl text-left relative z-10 flex-1 w-full flex flex-col justify-between h-full">
      <div className="space-y-6">
        <div className="w-32 h-7 bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="space-y-3">
          <div className="w-3/4 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="w-2/3 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-lg mt-4" />
          <div className="w-4/5 h-4 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-6 w-full sm:w-auto mt-auto">
        <div className="w-36 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="w-40 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    </div>
    <div className="relative w-full max-w-[260px] shrink-0 z-10 hidden md:flex flex-col justify-center">
      <div className="w-full h-full min-h-[200px] bg-slate-100 dark:bg-slate-800 rounded-[24px]" />
    </div>
  </div>
);

export const AIInsightsSkeleton = () => (
  <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm h-full animate-pulse flex flex-col justify-between">
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="w-24 h-5 bg-slate-100 dark:bg-slate-800 rounded-md" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
          <div className="w-5/6 h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    </div>
    <div className="w-full h-10 bg-slate-100 dark:bg-slate-800 rounded-xl mt-6" />
  </div>
);

export const TasksSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-full animate-pulse flex flex-col">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
        <div className="w-28 h-5 bg-slate-100 dark:bg-slate-800 rounded-md" />
      </div>
      <div className="w-10 h-5 bg-slate-100 dark:bg-slate-800 rounded-md" />
    </div>
    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-6" />
    <div className="space-y-3 flex-1">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-start gap-3 p-2">
          <div className="w-4 h-4 bg-slate-100 dark:bg-slate-800 rounded mt-0.5 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="w-2/3 h-3 bg-slate-100 dark:bg-slate-800 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const RecentStudySkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-full flex flex-col animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
        <div className="w-32 h-5 bg-slate-100 dark:bg-slate-800 rounded-md" />
      </div>
      <div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
    </div>
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-12 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="w-14 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="flex gap-1">
        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-md" />
        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-md" />
      </div>
    </div>
    <div className="space-y-2 flex-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-3/4 h-3 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="w-1/2 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-md" />
          </div>
          <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const CalendarSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-full flex flex-col animate-pulse">
    <div className="flex items-center justify-between mb-6">
      <div className="w-24 h-6 bg-slate-100 dark:bg-slate-800 rounded-md" />
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1 mb-2">
      {[1,2,3,4,5,6,7].map(i => (
        <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded mx-1" />
      ))}
    </div>
    <div className="grid grid-cols-7 gap-1 flex-1">
      {Array.from({length: 35}).map((_, i) => (
        <div key={i} className="aspect-square bg-slate-50 dark:bg-slate-800/30 rounded-lg m-0.5" />
      ))}
    </div>
  </div>
);

export const StorageQuotaSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-full flex flex-col animate-pulse">
    <div className="flex items-center gap-2 mb-6">
      <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
      <div className="w-28 h-5 bg-slate-100 dark:bg-slate-800 rounded-md" />
    </div>
    <div className="space-y-4">
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full" />
      <div className="flex justify-between">
        <div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
        <div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
      </div>
    </div>
    <div className="w-3/4 h-3 bg-slate-100 dark:bg-slate-800 rounded-md mt-6" />
  </div>
);

export const WorkspaceCardSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-800 rounded-[24px] overflow-hidden shadow-xs h-72 flex flex-col justify-between animate-pulse">
    <div>
      <div className="h-28 bg-slate-100 dark:bg-slate-800 relative">
        <div className="absolute -bottom-3 left-4 w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-850" />
      </div>
      <div className="pt-6 px-4 space-y-2.5">
        <div className="w-16 h-3.5 bg-slate-100 dark:bg-slate-800 rounded-md" />
        <div className="w-3/4 h-5 bg-slate-100 dark:bg-slate-800 rounded-md" />
        <div className="w-full h-3 bg-slate-100/70 dark:bg-slate-800/60 rounded-md" />
        <div className="w-2/3 h-3 bg-slate-100/70 dark:bg-slate-800/60 rounded-md" />
      </div>
    </div>
    <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
      <div className="w-20 h-4 bg-slate-100 dark:bg-slate-800 rounded-md" />
      <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
    </div>
  </div>
);

export const HomeWorkspaceSkeleton = () => (
  <div className="p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40 animate-pulse flex flex-col justify-between min-h-[240px]">
    <div>
      <div className="w-full h-24 rounded-lg bg-slate-200/70 dark:bg-slate-800 mb-3.5" />
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-slate-200/70 dark:bg-slate-800" />
        <div className="w-20 h-3 bg-slate-200/70 dark:bg-slate-800 rounded" />
      </div>
      <div className="w-3/4 h-4 bg-slate-200/70 dark:bg-slate-800 rounded mb-2" />
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/60 rounded mb-1" />
      <div className="w-2/3 h-3 bg-slate-100 dark:bg-slate-800/60 rounded" />
    </div>
    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
      <div className="w-full h-8 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
    </div>
  </div>
);

export const RecentActivitySkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-800 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="w-1/2 h-3.5 bg-slate-200/70 dark:bg-slate-800 rounded" />
            <div className="w-3/4 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        </div>
        <div className="w-14 h-3 bg-slate-200/70 dark:bg-slate-800 rounded shrink-0" />
      </div>
    ))}
  </div>
);

export const ResourceCardSkeleton = () => (
  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 animate-pulse flex items-center justify-between">
    <div className="flex items-center gap-3 flex-1">
      <div className="w-9 h-9 rounded-lg bg-slate-200/70 dark:bg-slate-800 shrink-0" />
      <div className="space-y-1.5 flex-1">
        <div className="w-2/3 h-4 bg-slate-200/70 dark:bg-slate-800 rounded" />
        <div className="w-1/3 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    </div>
    <div className="w-6 h-6 rounded-md bg-slate-200/70 dark:bg-slate-800 shrink-0 ml-2" />
  </div>
);
