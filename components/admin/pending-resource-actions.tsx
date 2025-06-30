"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PendingResourceActionsProps {
  resourceUuid: string;
  resourceTitle: string;
}

export default function PendingResourceActions({
  resourceUuid,
  resourceTitle
}: PendingResourceActionsProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      
      const response = await fetch(`/api/admin/resources/${resourceUuid}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success("资源审核通过");
        router.refresh(); // 刷新页面数据
      } else {
        throw new Error(result.message || '审核失败');
      }

    } catch (error) {
      console.error("审核失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("审核失败，请稍后再试");
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      
      const response = await fetch(`/api/admin/resources/${resourceUuid}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: rejectReason.trim() || undefined
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success("资源已拒绝");
        setShowRejectDialog(false);
        setRejectReason("");
        router.refresh(); // 刷新页面数据
      } else {
        throw new Error(result.message || '拒绝失败');
      }

    } catch (error) {
      console.error("拒绝失败:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("拒绝失败，请稍后再试");
      }
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="default" 
          size="sm"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
        >
          {isApproving ? "处理中..." : "通过"}
        </Button>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => setShowRejectDialog(true)}
          disabled={isApproving || isRejecting}
        >
          拒绝
        </Button>
      </div>

      {/* 拒绝确认对话框 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝资源</DialogTitle>
            <DialogDescription>
              您确定要拒绝资源 "{resourceTitle}" 吗？
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">拒绝原因（可选）</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因，将通知资源作者"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
              disabled={isRejecting}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? "处理中..." : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
