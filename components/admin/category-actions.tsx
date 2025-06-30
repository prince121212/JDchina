"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface CategoryActionsProps {
  categoryId: number;
  categoryName: string;
}

export default function CategoryActions({ categoryId, categoryName }: CategoryActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success("分类删除成功");
        setShowDeleteDialog(false);
        router.refresh(); // 刷新页面数据
      } else {
        throw new Error(result.message || '删除失败');
      }

    } catch (error) {
      console.error("删除分类失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("删除失败，请稍后再试");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Link href={`/admin/categories/${categoryId}/edit`}>
          <Button variant="outline" size="sm">
            编辑
          </Button>
        </Link>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
        >
          删除
        </Button>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除分类</DialogTitle>
            <DialogDescription>
              您确定要删除分类 "{categoryName}" 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
