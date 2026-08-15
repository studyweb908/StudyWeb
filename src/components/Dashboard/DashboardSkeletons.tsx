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
