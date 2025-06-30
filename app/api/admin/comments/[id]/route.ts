import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { getCommentById, deleteComment } from "@/models/comment";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/admin/comments/[id] - 删除评论
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // 检查管理员权限
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return respUnauthorized("无管理员权限");
    }

    const { id } = await params;
    if (!id) {
      return respInvalidParams("评论ID不能为空");
    }

    log.info("管理员删除评论", { commentId: id, user_uuid });

    // 检查评论是否存在
    const existingComment = await getCommentById(parseInt(id));
    if (!existingComment) {
      return respNotFound("评论不存在");
    }

    // 删除评论
    await deleteComment(existingComment.uuid);

    log.info("评论删除成功", { 
      commentId: id, 
      commentUuid: existingComment.uuid,
      content: existingComment.content.substring(0, 50) + '...',
      user_uuid 
    });

    return respData({
      message: "评论删除成功"
    });

  } catch (error) {
    log.error("删除评论失败", error as Error, {
      commentId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });
    return respErr("删除评论失败");
  }
}
