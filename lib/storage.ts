import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { log } from "@/lib/logger";
import sharp from "sharp";
import { createHash } from "crypto";

// 原本仅支持AWS S3，现在支持其他存储服务 先尝试接入腾讯云COS
interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

interface UploadOptions {
  body: Buffer;
  key: string;
  contentType?: string;
  bucket?: string;
  onProgress?: (progress: number) => void;
  disposition?: "inline" | "attachment";
  // 新增优化选项
  optimize?: boolean;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  enableCDN?: boolean;
}

interface UploadResult {
  Key: string;
  Location: string;
  publicUrl: string;
  cdnUrl?: string;
  originalSize: number;
  optimizedSize?: number;
  compressionRatio?: number;
}

export function newStorage(config?: StorageConfig) {
  return new Storage(config);
}

// 图片优化工具函数
export class ImageOptimizer {
  static async optimizeImage(
    buffer: Buffer,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
    } = {}
  ): Promise<{ buffer: Buffer; format: string; originalSize: number; optimizedSize: number }> {
    const { quality = 80, maxWidth = 1920, maxHeight = 1080, format = 'webp' } = options;
    const originalSize = buffer.length;

    try {
      let sharpInstance = sharp(buffer);

      // 获取图片信息
      const metadata = await sharpInstance.metadata();

      // 调整尺寸（如果需要）
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true
          });
        }
      }

      // 根据格式进行优化
      let optimizedBuffer: Buffer;
      let outputFormat = format;

      switch (format) {
        case 'webp':
          optimizedBuffer = await sharpInstance
            .webp({ quality, effort: 6 })
            .toBuffer();
          break;
        case 'avif':
          optimizedBuffer = await sharpInstance
            .avif({ quality, effort: 9 })
            .toBuffer();
          break;
        case 'jpeg':
          optimizedBuffer = await sharpInstance
            .jpeg({ quality, progressive: true, mozjpeg: true })
            .toBuffer();
          break;
        case 'png':
          optimizedBuffer = await sharpInstance
            .png({ quality, progressive: true, compressionLevel: 9 })
            .toBuffer();
          break;
        default:
          // 默认使用WebP
          optimizedBuffer = await sharpInstance
            .webp({ quality, effort: 6 })
            .toBuffer();
          outputFormat = 'webp';
      }

      const optimizedSize = optimizedBuffer.length;

      log.info("图片优化完成", {
        originalSize,
        optimizedSize,
        compressionRatio: ((originalSize - optimizedSize) / originalSize * 100).toFixed(2) + '%',
        format: outputFormat,
        quality
      });

      return {
        buffer: optimizedBuffer,
        format: outputFormat,
        originalSize,
        optimizedSize
      };

    } catch (error) {
      log.warn("图片优化失败，使用原始图片", { error: error as Error, originalSize });
      return {
        buffer,
        format: 'original',
        originalSize,
        optimizedSize: originalSize
      };
    }
  }

  static isImageFile(contentType: string): boolean {
    return contentType.startsWith('image/');
  }

  static getOptimalFormat(contentType: string): 'webp' | 'avif' | 'jpeg' | 'png' {
    // 根据原始格式选择最优的输出格式
    if (contentType.includes('png')) {
      return 'webp'; // PNG转WebP通常有更好的压缩率
    }
    if (contentType.includes('gif')) {
      return 'webp'; // GIF转WebP支持动画且压缩更好
    }
    return 'webp'; // 默认使用WebP
  }
}

export class Storage {
  private s3: S3Client;

  constructor(config?: StorageConfig) {
    const endpoint = config?.endpoint || process.env.STORAGE_ENDPOINT || "";
    const accessKey = config?.accessKey || process.env.STORAGE_ACCESS_KEY || "";
    const secretKey = config?.secretKey || process.env.STORAGE_SECRET_KEY || "";
    const region = config?.region || process.env.STORAGE_REGION || "auto";

    // 验证必需的配置参数
    if (!endpoint) {
      throw new Error("Storage endpoint is required. Please set STORAGE_ENDPOINT environment variable.");
    }
    if (!accessKey) {
      throw new Error("Storage access key is required. Please set STORAGE_ACCESS_KEY environment variable.");
    }
    if (!secretKey) {
      throw new Error("Storage secret key is required. Please set STORAGE_SECRET_KEY environment variable.");
    }

    // 验证endpoint是否为有效URL
    try {
      new URL(endpoint);
    } catch (error) {
      throw new Error(`Invalid storage endpoint URL: ${endpoint}`);
    }

    // 检查存储服务类型
    const isTencentCOS = endpoint.includes('cos.') || endpoint.includes('myqcloud.com');
    const isCloudflareR2 = endpoint.includes('r2.cloudflarestorage.com');

    this.s3 = new S3Client({
      endpoint: endpoint,
      region: region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      // Cloudflare R2 和腾讯云COS需要禁用路径样式
      forcePathStyle: !isTencentCOS && !isCloudflareR2,
    });
  }

  async uploadFile(options: UploadOptions): Promise<UploadResult> {
    const {
      body,
      key: originalKey,
      contentType,
      bucket,
      onProgress,
      disposition = "inline",
      optimize = true,
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080,
      format,
      enableCDN = true
    } = options;

    let key = originalKey; // 使用let声明，允许重新赋值
    const bucketName = bucket || process.env.STORAGE_BUCKET || "";
    if (!bucketName) {
      throw new Error("Bucket is required. Please set STORAGE_BUCKET environment variable.");
    }

    // 验证上传参数
    if (!key || key.trim().length === 0) {
      throw new Error("File key cannot be empty");
    }
    if (!body || body.length === 0) {
      throw new Error("File body cannot be empty");
    }

    const originalSize = body.length;
    let uploadBuffer = body;
    let finalContentType = contentType;
    let optimizedSize = originalSize;
    let compressionRatio = 0;

    // 图片优化处理
    if (optimize && contentType && ImageOptimizer.isImageFile(contentType)) {
      try {
        const optimizeFormat = format || ImageOptimizer.getOptimalFormat(contentType);
        const optimizeResult = await ImageOptimizer.optimizeImage(body, {
          quality,
          maxWidth,
          maxHeight,
          format: optimizeFormat
        });

        uploadBuffer = optimizeResult.buffer;
        optimizedSize = optimizeResult.optimizedSize;
        compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

        // 更新文件扩展名和Content-Type
        if (optimizeResult.format !== 'original') {
          const keyParts = key.split('.');
          if (keyParts.length > 1) {
            keyParts[keyParts.length - 1] = optimizeResult.format;
            key = keyParts.join('.');
          }
          finalContentType = `image/${optimizeResult.format}`;
        }

        log.info("文件优化成功", {
          key,
          originalSize,
          optimizedSize,
          compressionRatio: compressionRatio.toFixed(2) + '%',
          format: optimizeResult.format
        });

      } catch (error) {
        log.warn("文件优化失败，使用原始文件", { error: error as Error, key });
      }
    }

    try {
      // 生成文件哈希用于缓存控制
      const fileHash = createHash('md5').update(uploadBuffer).digest('hex');

      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: uploadBuffer,
          ContentDisposition: disposition,
          ContentType: finalContentType,
          // 添加缓存控制头
          CacheControl: 'public, max-age=31536000', // 1年缓存
          // 添加ETag用于缓存验证
          Metadata: {
            'original-size': originalSize.toString(),
            'optimized-size': optimizedSize.toString(),
            'file-hash': fileHash,
            'upload-time': new Date().toISOString(),
          },
        },
      });

      if (onProgress) {
        upload.on("httpUploadProgress", (progress) => {
          const percentage =
            ((progress.loaded || 0) / (progress.total || 1)) * 100;
          onProgress(percentage);
        });
      }

      const res = await upload.done();

      if (!res.Key) {
        throw new Error("Upload completed but no key returned");
      }

      // 构建公共访问URL
      let publicUrl = res.Location || '';
      let cdnUrl: string | undefined;

      // 优先使用STORAGE_PUBLIC_URL（Cloudflare R2公共域名）
      if (process.env.STORAGE_PUBLIC_URL && res.Key) {
        // 确保公共URL格式正确
        const baseUrl = process.env.STORAGE_PUBLIC_URL.replace(/\/$/, '');
        publicUrl = `${baseUrl}/${res.Key}`;

        // 如果启用CDN，生成CDN URL
        if (enableCDN) {
          cdnUrl = publicUrl; // Cloudflare R2本身就是CDN
        }
      }
      // 备用：使用STORAGE_DOMAIN（腾讯云COS等）
      else if (process.env.STORAGE_DOMAIN && res.Key) {
        const baseUrl = process.env.STORAGE_DOMAIN.replace(/\/$/, '');
        publicUrl = `${baseUrl}/${res.Key}`;
      }

      // 验证生成的URL是否有效
      if (!publicUrl) {
        throw new Error("Failed to generate public URL for uploaded file");
      }

      const result: UploadResult = {
        Key: res.Key,
        Location: res.Location || publicUrl,
        publicUrl,
        originalSize,
        optimizedSize,
        compressionRatio: compressionRatio > 0 ? compressionRatio : undefined,
        cdnUrl,
      };

      log.info("文件上传成功", {
        key: res.Key,
        publicUrl,
        cdnUrl,
        originalSize,
        optimizedSize,
        compressionRatio: compressionRatio > 0 ? compressionRatio.toFixed(2) + '%' : undefined,
      });

      return result;
    } catch (error) {
      log.error("文件上传失败", error as Error, { key, originalSize });

      // 提供更详细的错误信息
      if (error instanceof Error) {
        if (error.message.includes('NoSuchBucket')) {
          throw new Error(`Storage bucket '${bucketName}' does not exist`);
        }
        if (error.message.includes('AccessDenied')) {
          throw new Error('Storage access denied. Please check credentials and permissions');
        }
        if (error.message.includes('NetworkingError') || error.message.includes('timeout')) {
          throw new Error('Network error occurred while uploading to storage');
        }
      }
      throw new Error(`Upload failed: ${error}`);
    }
  }

  async downloadAndUpload({
    url,
    key,
    bucket,
    contentType,
    disposition = "inline",
  }: {
    url: string;
    key: string;
    bucket?: string;
    contentType?: string;
    disposition?: "inline" | "attachment";
  }) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No body in response");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return this.uploadFile({
      body: buffer,
      key,
      bucket,
      contentType,
      disposition,
    });
  }
}
