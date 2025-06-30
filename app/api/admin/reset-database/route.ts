import { respData, respErr, respUnauthorized } from "@/lib/resp";
import { getUserUuid, isUserAdmin, getUserEmail } from "@/services/user";
import { log } from "@/lib/logger";
import { getSupabaseClient } from "@/models/db";
import { sendEmail } from "@/lib/wework-email";
import { randomBytes } from "crypto";

// 存储验证码的临时缓存（生产环境应使用Redis）
const verificationCodes = new Map<string, { code: string; expires: number; email: string }>();

// 清理过期验证码，防止内存泄漏
const cleanupExpiredCodes = () => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, value] of verificationCodes.entries()) {
    if (now > value.expires) {
      verificationCodes.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    log.info(`清理过期验证码 ${cleanedCount} 个，当前缓存大小: ${verificationCodes.size}`);
  }

  return cleanedCount;
};

// 获取验证码前先清理过期的验证码
const getVerificationCode = (userUuid: string) => {
  // 每次访问时清理过期验证码
  cleanupExpiredCodes();
  return verificationCodes.get(userUuid);
};

// 设置验证码前先清理过期的验证码
const setVerificationCode = (userUuid: string, codeData: { code: string; expires: number; email: string }) => {
  // 每次设置时清理过期验证码
  cleanupExpiredCodes();
  verificationCodes.set(userUuid, codeData);

  // 如果缓存过大，强制清理
  if (verificationCodes.size > 1000) {
    log.warn(`验证码缓存过大 (${verificationCodes.size})，执行强制清理`);
    cleanupExpiredCodes();
  }
};

// 删除验证码
const deleteVerificationCode = (userUuid: string) => {
  return verificationCodes.delete(userUuid);
};

// 生成加密安全的6位数字验证码
function generateSecureVerificationCode(): string {
  // 使用crypto.randomBytes生成安全的随机数
  const buffer = randomBytes(4);
  const randomNumber = buffer.readUInt32BE(0);
  // 确保生成6位数字（100000-999999）
  const code = (randomNumber % 900000) + 100000;
  return code.toString();
}

// POST /api/admin/reset-database - 重置数据库（清空脏数据）
export async function POST(req: Request) {
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

    const user_email = await getUserEmail();
    if (!user_email) {
      return respUnauthorized("无法获取用户邮箱");
    }

    const body = await req.json().catch(() => ({}));
    const { action, verification_code } = body;

    // 第一步：发送验证码
    if (action === 'send_verification') {
      // 使用加密安全的随机数生成6位验证码
      const code = generateSecureVerificationCode();
      const expires = Date.now() + 10 * 60 * 1000; // 10分钟有效期

      setVerificationCode(user_uuid, { code, expires, email: user_email });

      try {
        await sendEmail({
          to: user_email,
          subject: "数据库重置验证码 - 文明知识库",
          html: `
            <h2>数据库重置验证码</h2>
            <p>您正在请求重置数据库，这是一个危险操作，将清空所有资源数据。</p>
            <p>验证码：<strong style="font-size: 24px; color: #e74c3c;">${code}</strong></p>
            <p>验证码有效期：10分钟</p>
            <p>如果这不是您的操作，请忽略此邮件。</p>
          `
        });

        log.warn("数据库重置验证码已发送", { user_uuid, user_email });
        return respData({ message: "验证码已发送到您的邮箱，请查收" });
      } catch (error) {
        log.error("发送验证码失败", error as Error, { user_uuid, user_email });
        return respErr("发送验证码失败，请稍后再试");
      }
    }

    // 第二步：验证码确认并执行重置
    if (action === 'confirm_reset') {
      if (!verification_code) {
        return respErr("请输入验证码");
      }

      const storedData = getVerificationCode(user_uuid);
      if (!storedData) {
        return respErr("验证码已过期，请重新获取");
      }

      if (Date.now() > storedData.expires) {
        deleteVerificationCode(user_uuid);
        return respErr("验证码已过期，请重新获取");
      }

      if (storedData.code !== verification_code) {
        return respErr("验证码错误");
      }

      if (storedData.email !== user_email) {
        return respErr("邮箱验证失败");
      }

      // 验证通过，删除验证码
      deleteVerificationCode(user_uuid);
    } else {
      return respErr("无效的操作类型");
    }

    log.warn("管理员开始重置数据库", { user_uuid });

    const supabase = getSupabaseClient();
    const results = {
      resource_comments: 0,
      resource_ratings: 0,
      user_favorites: 0,
      download_history: 0,
      resource_tags: 0,
      resources: 0,
      categories: 0,
      tags: 0
    };

    try {
      // 1. 删除评论
      const { count: commentsCount, error: commentsError } = await supabase
        .from("resource_comments")
        .delete({ count: 'exact' })
        .gte('id', 0); // 删除所有记录

      if (commentsError) {
        log.error("删除评论失败", commentsError);
      } else {
        results.resource_comments = commentsCount || 0;
        log.info("评论删除完成", { count: results.resource_comments });
      }

      // 2. 删除评分
      const { count: ratingsCount, error: ratingsError } = await supabase
        .from("resource_ratings")
        .delete({ count: 'exact' })
        .gte('id', 0);

      if (ratingsError) {
        log.error("删除评分失败", ratingsError);
      } else {
        results.resource_ratings = ratingsCount || 0;
        log.info("评分删除完成", { count: results.resource_ratings });
      }

      // 3. 删除收藏
      const { count: favoritesCount, error: favoritesError } = await supabase
        .from("user_favorites")
        .delete({ count: 'exact' })
        .gte('id', 0);

      if (favoritesError) {
        log.error("删除收藏失败", favoritesError);
      } else {
        results.user_favorites = favoritesCount || 0;
        log.info("收藏删除完成", { count: results.user_favorites });
      }

      // 4. 删除下载历史
      const { count: downloadHistoryCount, error: downloadHistoryError } = await supabase
        .from("download_history")
        .delete({ count: 'exact' })
        .gte('id', 0);

      if (downloadHistoryError) {
        log.error("删除下载历史失败", downloadHistoryError);
      } else {
        results.download_history = downloadHistoryCount || 0;
        log.info("下载历史删除完成", { count: results.download_history });
      }

      // 5. 删除资源标签关联
      const { count: resourceTagsCount, error: resourceTagsError } = await supabase
        .from("resource_tags")
        .delete({ count: 'exact' })
        .gte('resource_id', 0);

      if (resourceTagsError) {
        log.error("删除资源标签关联失败", resourceTagsError);
      } else {
        results.resource_tags = resourceTagsCount || 0;
        log.info("资源标签关联删除完成", { count: results.resource_tags });
      }

      // 6. 删除资源
      const { count: resourcesCount, error: resourcesError } = await supabase
        .from("resources")
        .delete({ count: 'exact' })
        .gte('id', 0);

      if (resourcesError) {
        log.error("删除资源失败", resourcesError);
      } else {
        results.resources = resourcesCount || 0;
        log.info("资源删除完成", { count: results.resources });
      }

      // 7. 删除分类
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from("categories")
        .delete({ count: 'exact' })
        .gte('id', 0);

      if (categoriesError) {
        log.error("删除分类失败", categoriesError);
      } else {
        results.categories = categoriesCount || 0;
        log.info("分类删除完成", { count: results.categories });
      }

      // 8. 删除标签
      const { count: tagsCount, error: tagsError } = await supabase
        .from("tags")
        .delete({ count: 'exact' })
        .gte('id', 0);

      if (tagsError) {
        log.error("删除标签失败", tagsError);
      } else {
        results.tags = tagsCount || 0;
        log.info("标签删除完成", { count: results.tags });
      }

      log.warn("数据库重置完成", { user_uuid, results });

      return respData({
        message: "数据库重置成功",
        results
      });

    } catch (error) {
      log.error("数据库重置过程中发生错误", error as Error, { user_uuid });
      return respErr("数据库重置失败");
    }

  } catch (error) {
    log.error("重置数据库失败", error as Error);
    return respErr("重置数据库失败");
  }
}
