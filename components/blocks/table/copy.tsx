"use client";

import { ReactNode } from "react";
import { Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";

export default function CopyComponent({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制");
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error("复制失败");
    }
  };

  return (
    <div
      className="cursor-pointer flex items-center gap-2 hover:text-primary transition-colors"
      onClick={handleCopy}
      title="点击复制"
    >
      {children}
      <CopyIcon className="h-3 w-3 opacity-50 hover:opacity-100" />
    </div>
  );
}
