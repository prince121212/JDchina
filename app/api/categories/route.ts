import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";
import { getAllCategories, createCategory } from "@/models/category";

// GET /api/categories - 获取分类列表
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeChildren = searchParams.get('include_children') === 'true';
    const includeCount = searchParams.get('include_count') === 'true';

    log.info("获取分类列表", { includeChildren, includeCount });

    const categories = await getAllCategories(includeChildren, includeCount);

    return respData({
      categories,
      total: categories.length
    });

  } catch (error) {
    log.error("获取分类列表失败", error as Error);
    return respErr("获取分类列表失败");
  }
}

// POST /api/categories - 创建新分类（管理员功能）
export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // TODO: 检查管理员权限
    // const isAdmin = await checkAdminPermission(user_uuid);
    // if (!isAdmin) {
    //   return respUnauthorized("无权限执行此操作");
    // }

    const body = await req.json();
    const {
      name,
      description,
      parent_id,
      icon,
      sort_order
    } = body;

    // 验证必填字段
    if (!name?.trim()) {
      return respInvalidParams("分类名称不能为空");
    }

    // 验证名称长度
    if (name.trim().length > 50) {
      return respInvalidParams("分类名称不能超过50个字符");
    }

    // 验证描述长度
    if (description && description.trim().length > 200) {
      return respInvalidParams("分类描述不能超过200个字符");
    }

    // 创建分类对象
    const category = {
      name: name.trim(),
      description: description?.trim() || null,
      parent_id: parent_id || null,
      icon: icon?.trim() || null,
      sort_order: sort_order || 0,
    };

    log.info("创建分类", { 
      name: category.name, 
      parent_id: category.parent_id,
      user_uuid 
    });

    const createdCategory = await createCategory(category);

    log.info("分类创建成功", { 
      categoryId: createdCategory.id, 
      name: category.name 
    });

    return respData({
      category: createdCategory,
      message: "分类创建成功"
    });

  } catch (error) {
    log.error("创建分类失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
    });

    // 根据错误类型返回更具体的错误信息
    if (error instanceof Error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return respErr("分类名称已存在");
      }
      if (error.message.includes('parent_id')) {
        return respErr("无效的父分类ID");
      }
    }

    return respErr("创建分类失败，请稍后再试");
  }
}
