import { respData, respErr, respInvalidParams, respUnauthorized, respNotFound } from "@/lib/resp";
import { getUserUuid, isUserAdmin } from "@/services/user";
import { log } from "@/lib/logger";
import { findCategoryById, updateCategory, deleteCategory } from "@/models/category";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/admin/categories/[id] - 获取单个分类
export async function GET(req: Request, { params }: RouteParams) {
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
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId)) {
      return respInvalidParams("分类ID格式错误");
    }

    log.info("获取分类详情", { categoryId, user_uuid });

    const category = await findCategoryById(categoryId);
    if (!category) {
      return respNotFound("分类不存在");
    }

    return respData({ category });

  } catch (error) {
    log.error("获取分类详情失败", error as Error, {
      categoryId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    return respErr("获取分类详情失败，请稍后再试");
  }
}

// PUT /api/admin/categories/[id] - 更新分类
export async function PUT(req: Request, { params }: RouteParams) {
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
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId)) {
      return respInvalidParams("分类ID格式错误");
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, parent_id, icon, sort_order } = body;

    if (!name || !name.trim()) {
      return respInvalidParams("分类名称不能为空");
    }

    log.info("更新分类", { categoryId, name, user_uuid });

    // 检查分类是否存在
    const existingCategory = await findCategoryById(categoryId);
    if (!existingCategory) {
      return respNotFound("分类不存在");
    }

    const updateData = {
      name: name.trim(),
      description: description?.trim() || undefined,
      parent_id: parent_id || undefined,
      icon: icon?.trim() || undefined,
      sort_order: sort_order || 0
    };

    const category = await updateCategory(categoryId, updateData);

    log.info("分类更新成功", { 
      categoryId, 
      name: category.name,
      user_uuid 
    });

    return respData({
      message: "分类更新成功",
      category
    });

  } catch (error) {
    log.error("更新分类失败", error as Error, {
      categoryId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    return respErr("更新分类失败，请稍后再试");
  }
}

// DELETE /api/admin/categories/[id] - 删除分类
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
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId)) {
      return respInvalidParams("分类ID格式错误");
    }

    log.info("删除分类", { categoryId, user_uuid });

    // 检查分类是否存在
    const existingCategory = await findCategoryById(categoryId);
    if (!existingCategory) {
      return respNotFound("分类不存在");
    }

    await deleteCategory(categoryId);

    log.info("分类删除成功", { 
      categoryId, 
      name: existingCategory.name,
      user_uuid 
    });

    return respData({
      message: "分类删除成功"
    });

  } catch (error) {
    log.error("删除分类失败", error as Error, {
      categoryId: await params.then(p => p.id),
      user_uuid: await getUserUuid().catch(() => 'unknown')
    });

    return respErr("删除分类失败，请稍后再试");
  }
}
