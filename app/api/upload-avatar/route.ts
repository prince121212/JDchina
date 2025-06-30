import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { newStorage } from "@/lib/storage";
import { getUuid } from "@/lib/hash";
import { log } from "@/lib/logger";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

// 根据MIME类型获取正确的文件扩展名
function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
  };
  return mimeToExt[mimeType] || 'jpg';
}

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // 验证存储配置
    if (!process.env.STORAGE_ENDPOINT || !process.env.STORAGE_ACCESS_KEY || !process.env.STORAGE_SECRET_KEY || !process.env.STORAGE_BUCKET) {
      log.error("Storage configuration incomplete", undefined, {
        hasEndpoint: !!process.env.STORAGE_ENDPOINT,
        hasAccessKey: !!process.env.STORAGE_ACCESS_KEY,
        hasSecretKey: !!process.env.STORAGE_SECRET_KEY,
        hasBucket: !!process.env.STORAGE_BUCKET,
      });
      return respErr("存储服务配置不完整，请联系管理员");
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return respInvalidParams("请选择要上传的文件");
    }

    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return respInvalidParams("请选择图片文件（JPG、PNG、GIF）");
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return respInvalidParams("文件大小不能超过2MB");
    }

    // 转换文件为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用MIME类型生成正确的文件扩展名
    const fileExtension = getFileExtensionFromMimeType(file.type);
    const filename = `avatar_${user_uuid}_${getUuid()}.${fileExtension}`;
    const key = `avatars/${filename}`;

    log.info("开始上传头像到R2存储", {
      user_uuid,
      filename,
      fileSize: file.size,
      fileType: file.type,
    });

    // 上传到R2存储（启用图片优化）
    const storage = newStorage();
    const uploadResult = await storage.uploadFile({
      body: buffer,
      key,
      contentType: file.type,
      disposition: "inline",
      optimize: true,
      quality: 85,
      maxWidth: 512,
      maxHeight: 512,
      format: 'webp',
    });

    log.info("头像上传成功", {
      user_uuid,
      filename: uploadResult.Key.split("/").pop(),
      url: uploadResult.publicUrl,
      originalSize: uploadResult.originalSize,
      optimizedSize: uploadResult.optimizedSize,
    });

    return respData({
      url: uploadResult.publicUrl,
      filename: uploadResult.Key.split("/").pop(),
      message: "头像上传成功",
      optimization: {
        originalSize: uploadResult.originalSize,
        optimizedSize: uploadResult.optimizedSize,
        compressionRatio: uploadResult.compressionRatio,
      },
    });

  } catch (error) {
    log.error("头像上传失败", error instanceof Error ? error : new Error(String(error)), {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    // 根据错误类型返回更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('Bucket is required')) {
        return respErr("存储配置错误，请联系管理员");
      }
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return respErr("网络连接失败，请检查网络后重试");
      }
      if (error.message.includes('credentials') || error.message.includes('access')) {
        return respErr("存储服务认证失败，请联系管理员");
      }
    }

    return respErr("头像上传失败，请稍后再试");
  }
}
