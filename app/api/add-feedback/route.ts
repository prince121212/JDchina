import { respData, respErr } from "@/lib/resp";

import { Feedback } from "@/types/feedback";
import { getIsoTimestr } from "@/lib/time";
import { getUserUuid } from "@/services/user";
import { insertFeedback } from "@/models/feedback";
import { log } from "@/lib/logger";

// 移除 edge runtime 以避免 nodemailer 兼容性问题
// export const runtime = "edge";

export async function POST(req: Request) {
  let content = '';
  let rating = null;
  let user_uuid = '';

  try {
    // 解析请求数据
    const requestData = await req.json();
    content = requestData.content;
    rating = requestData.rating;

    log.info("反馈提交请求", { content: content?.substring(0, 50) + '...', rating });

    // 验证参数
    if (!content || content.trim().length === 0) {
      log.warn("反馈内容为空");
      return respErr("反馈内容不能为空");
    }

    if (content.trim().length > 1000) {
      log.warn("反馈内容过长", { length: content.length });
      return respErr("反馈内容过长，最多1000字符");
    }

    // 获取用户UUID
    user_uuid = await getUserUuid();
    if (!user_uuid) {
      log.warn("用户未登录，无法提交反馈");
      return respErr("请先登录后再提交反馈");
    }

    log.info("用户反馈信息", { user_uuid, contentLength: content.length, rating });

    // 创建反馈对象
    const feedback: Feedback = {
      user_uuid: user_uuid,
      content: content.trim(),
      rating: rating || 10, // 默认评分为10
      created_at: getIsoTimestr(),
      status: "created",
    };

    // 插入数据库
    await insertFeedback(feedback);

    log.info("反馈提交成功", { user_uuid, feedbackId: feedback.id });

    return respData({
      message: "反馈提交成功，感谢您的宝贵意见！",
      feedback: {
        content: feedback.content,
        rating: feedback.rating,
        created_at: feedback.created_at
      }
    });

  } catch (error) {
    log.error("反馈提交失败", error as Error, {
      user_uuid,
      contentLength: content?.length || 0,
      rating
    });

    return respErr("反馈提交失败，请稍后再试");
  }
}
