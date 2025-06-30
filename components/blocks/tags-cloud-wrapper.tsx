"use client";

import dynamic from 'next/dynamic';

// 动态导入 TagsCloud，禁用 SSR
const TagsCloud = dynamic(() => import('./tags-cloud'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-wrap gap-3 justify-center">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={`h-8 bg-muted rounded-full animate-pulse ${
            i % 4 === 0 ? 'w-20' :
            i % 4 === 1 ? 'w-16' :
            i % 4 === 2 ? 'w-24' : 'w-12'
          }`}
        />
      ))}
    </div>
  )
});

export default function TagsCloudWrapper() {
  return <TagsCloud />;
}
