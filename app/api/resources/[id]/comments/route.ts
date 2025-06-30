import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { findResourceByUuid } from "@/models/resource";
import { getResourceComments, addResourceComment } from "@/models/comment";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/resources/[id]/comments - 获取资源评论列表
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 最大100条

    log.info("获取资源评论列表", { resourceId: id, offset, limit });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    if (!resource.id) {
      return respErr("资源数据异常");
    }

    // 获取评论列表和总数
    const comments = await getResourceComments(resource.id, offset, limit);

    // 获取评论总数
    const { getResourceCommentsCount } = await import("@/models/comment");
    const totalComments = await getResourceCommentsCount(resource.id);

    return respData({
      comments,
      total: totalComments,
      offset,
      limit,
      resource: {
        uuid: resource.uuid,
        title: resource.title
      }
    });

  } catch (error) {
    log.error("获取资源评论列表失败", error as Error, {
      resourceId: await params.then(p => p.id)
    });
    return respErr("获取评论列表失败");
  }
}

// POST /api/resources/[id]/comments - 添加评论
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    const { id } = await params;
    if (!id) {
      return respInvalidParams("资源ID不能为空");
    }

    const body = await req.json();
    const { content, parent_id } = body;

    // 验证参数
    if (!content || typeof content !== 'string') {
      return respInvalidParams("评论内容不能为空");
    }

    if (content.trim().length < 1) {
      return respInvalidParams("评论内容不能为空");
    }

    if (content.length > 1000) {
      return respInvalidParams("评论内容不能超过1000字符");
    }

    if (parent_id && (typeof parent_id !== 'number' || parent_id <= 0)) {
      return respInvalidParams("无效的父评论ID");
    }

    log.info("添加资源评论", { resourceId: id, user_uuid, parent_id });

    // 检查资源是否存在
    const resource = await findResourceByUuid(id);
    if (!resource) {
      return respNotFound("资源不存在");
    }

    if (!resource.id) {
      return respErr("资源数据异常");
    }

    // 检查资源状态
    if (resource.status !== 'approved') {
      return respErr("只能对已审核通过的资源进行评论");
    }

    // 如果是回复，检查父评论是否存在
    if (parent_id) {
      const { getCommentById } = await import("@/models/comment");
      const parentComment = await getCommentById(parent_id);
      if (!parentComment) {
        return respNotFound("父评论不存在");
      }
      if (parentComment.resource_id !== resource.id) {
        return respInvalidParams("父评论不属于当前资源");
      }
    }

    // 添加评论
    const comment = await addResourceComment({
      resource_id: resource.id,
      user_uuid,
      content: content.trim(),
      parent_id: parent_id || undefined,
      status: 'approved' // 暂时自动审核通过
    });

    log.info("评论添加成功", { 
      commentId: comment.id,
      commentUuid: comment.uuid,
      resourceId: id, 
      user_uuid,
      parent_id
    });

    return respData({
      comment,
      message: "评论发布成功"
    });

  } catch (error) {
    log.error("添加资源评论失败", error as Error, {
      resourceId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    // 根据错误类型返回更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('foreign key')) {
        return respErr("资源或用户不存在");
      }
    }

    return respErr("评论发布失败，请稍后再试");
  }
}
