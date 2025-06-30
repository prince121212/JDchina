"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value?: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  className?: string;
}

export function Rating({
  value = 0,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
  showCount = false,
  count,
  className
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const handleMouseEnter = (starValue: number) => {
    if (!readonly) {
      setHoverValue(starValue);
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(0);
      setIsHovering(false);
    }
  };

  const handleClick = (starValue: number) => {
    if (!readonly && onChange) {
      onChange(starValue);
    }
  };

  const displayValue = isHovering ? hoverValue : value;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((starValue) => (
          <Star
            key={starValue}
            className={cn(
              sizeClasses[size],
              "transition-colors",
              readonly ? "cursor-default" : "cursor-pointer",
              starValue <= displayValue
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 hover:text-yellow-300"
            )}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starValue)}
          />
        ))}
      </div>
      
      {(showValue || showCount) && (
        <span className={cn("text-muted-foreground ml-1", textSizeClasses[size])}>
          {showValue && value.toFixed(1)}
          {showValue && showCount && count !== undefined && " "}
          {showCount && count !== undefined && `(${count})`}
        </span>
      )}
    </div>
  );
}

// 只读评分显示组件
export function RatingDisplay({
  value,
  count,
  size = "md",
  className
}: {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Rating
      value={value}
      readonly
      size={size}
      showValue
      showCount={count !== undefined}
      count={count}
      className={className}
    />
  );
}

// 交互式评分组件
export function RatingInput({
  value,
  onChange,
  size = "md",
  className
}: {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Rating
      value={value}
      onChange={onChange}
      size={size}
      className={className}
    />
  );
}
