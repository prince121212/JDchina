"use client";

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// 动态导入 CategoriesList，禁用 SSR
const CategoriesList = dynamic(() => import('./categories-list'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-muted rounded-lg" />
              <div className="space-y-2">
                <div className="h-5 w-24 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-full bg-muted rounded mb-2" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
});

export default function CategoriesListWrapper() {
  return <CategoriesList />;
}
