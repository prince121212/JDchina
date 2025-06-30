import { respData, respErr, respInvalidParams, respUnauthorized } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { createCategory, getAllCategories } from "@/models/category";

// GET /api/admin/categories - 获取分类列表
export async function GET(req: Request) {
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

    log.info("获取分类列表", { user_uuid });

    const categories = await getAllCategories(true, true);

    return respData({
      categories,
      total: categories.length
    });

  } catch (error) {
    log.error("获取分类列表失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/categories"
    });

    return respErr("获取分类列表失败，请稍后再试");
  }
}

// POST /api/admin/categories - 创建分类
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

    const body = await req.json().catch(() => ({}));
    const { name, description, parent_id, icon, sort_order } = body;

    if (!name || !name.trim()) {
      return respInvalidParams("分类名称不能为空");
    }

    log.info("创建分类", { name, parent_id, user_uuid });

    const categoryData = {
      name: name.trim(),
      description: description?.trim() || undefined,
      parent_id: parent_id || undefined,
      icon: icon?.trim() || undefined,
      sort_order: sort_order || 0
    };

    const category = await createCategory(categoryData);

    log.info("分类创建成功", { 
      categoryId: category.id, 
      name: category.name,
      user_uuid 
    });

    return respData({
      message: "分类创建成功",
      category
    });

  } catch (error) {
    log.error("创建分类失败", error as Error, {
      user_uuid: await getUserUuid().catch(() => 'unknown'),
      endpoint: "/api/admin/categories"
    });

    return respErr("创建分类失败，请稍后再试");
  }
}
