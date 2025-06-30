"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStatsProps {
  averageRating: number;
  totalRatings: number;
  ratingDistribution?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  className?: string;
}

export default function RatingStats({
  averageRating,
  totalRatings,
  ratingDistribution,
  className
}: RatingStatsProps) {
  // 如果没有提供分布数据，显示空分布
  const distribution = ratingDistribution || {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  const getPercentage = (count: number) => {
    return totalRatings > 0 ? (count / totalRatings) * 100 : 0;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">用户评分</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 总体评分 */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {totalRatings} 个评分
              </div>
            </div>

            {/* 评分分布 */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 w-8">
                    <span>{rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <Progress 
                    value={getPercentage(distribution[rating as keyof typeof distribution])} 
                    className="flex-1 h-2"
                  />
                  <span className="text-muted-foreground w-8 text-right">
                    {distribution[rating as keyof typeof distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 评分说明 */}
          {totalRatings === 0 && (
            <div className="text-center text-muted-foreground py-4">
              <p>暂无评分</p>
              <p className="text-xs mt-1">成为第一个评分的用户吧！</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
