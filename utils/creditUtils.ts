import { findResourceByUuid } from "@/models/resource";
import { log } from "@/lib/logger";

// 常量定义
export const MAX_RESOURCE_TITLE_LENGTH = 8;

// 导入类型定义
import type { ResourceInfo, EnrichedCredit } from "@/types/credit";

/**
 * 截断资源标题到指定长度
 * @param title 原始标题
 * @param maxLength 最大长度，默认为8
 * @returns 截断后的标题
 */
export function truncateResourceTitle(title: string, maxLength: number = MAX_RESOURCE_TITLE_LENGTH): string {
  if (!title) return '';
  return title.length > maxLength 
    ? title.substring(0, maxLength) + '...' 
    : title;
}

/**
 * 批量获取资源信息
 * @param resourceUuids 资源UUID数组
 * @returns 资源信息映射表
 */
export async function getResourcesMap(resourceUuids: string[]): Promise<Map<string, ResourceInfo>> {
  const resourceMap = new Map<string, ResourceInfo>();
  
  if (resourceUuids.length === 0) {
    return resourceMap;
  }

  // 并发获取所有资源信息
  const resourcePromises = resourceUuids.map(async (uuid) => {
    try {
      const resource = await findResourceByUuid(uuid);
      if (resource && resource.uuid && resource.title && resource.file_url !== undefined) {
        return {
          uuid: resource.uuid,
          title: resource.title,
          is_free: resource.is_free || false,
          credits: resource.credits || 0,
          file_url: resource.file_url || ''
        };
      }
    } catch (error) {
      log.warn("获取资源信息失败", { 
        resourceUuid: uuid,
        error: error as Error 
      });
    }
    return null;
  });

  const resources = await Promise.all(resourcePromises);

  resources.forEach((resource) => {
    if (resource && resource.uuid) {
      resourceMap.set(resource.uuid, resource);
    }
  });

  return resourceMap;
}

/**
 * 为积分记录添加资源信息
 * @param credits 原始积分记录数组
 * @returns 增强后的积分记录数组
 */
export async function enrichCreditsWithResources(credits: any[]): Promise<EnrichedCredit[]> {
  if (!credits || credits.length === 0) {
    return [];
  }

  // 提取所有需要查询的资源UUID
  const resourceUuids = credits
    .filter(credit => credit.trans_type === 'resource_access' && credit.order_no)
    .map(credit => credit.order_no)
    .filter((uuid, index, self) => self.indexOf(uuid) === index); // 去重

  // 批量获取资源信息
  const resourceMap = await getResourcesMap(resourceUuids);

  // 为每个积分记录添加资源信息
  return credits.map((credit): EnrichedCredit => {
    if (credit.trans_type === 'resource_access' && credit.order_no) {
      const resource = resourceMap.get(credit.order_no);
      return {
        ...credit,
        resource: resource || null
      };
    }

    return {
      ...credit,
      resource: null
    };
  });
}

/**
 * 生成资源链接的完整title属性
 * @param resource 资源信息
 * @returns 完整的title文本
 */
export function getResourceLinkTitle(resource: ResourceInfo): string {
  return `点击访问资源：${resource.title}`;
}
