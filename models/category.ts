import { getSupabaseClient, withRetry } from "./db";
import { log } from "@/lib/logger";
import { Category, CategoryWithChildren } from "@/types/resource";

// 获取所有分类（平铺结构）
export async function getAllCategories(includeChildren: boolean = false, includeCount: boolean = false): Promise<Category[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();

    let query = supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    const { data, error } = await query;

    if (error) {
      log.error("获取分类列表失败", error);
      throw error;
    }

    let categories = data || [];

    // 如果需要包含资源数量，批量获取所有分类的资源计数，避免N+1查询
    if (includeCount) {
      try {
        const resourceCounts = await getAllCategoriesResourceCount();
        categories = categories.map(cat => ({
          ...cat,
          resource_count: resourceCounts[cat.id] || 0
        }));
      } catch (countError) {
        log.warn("批量获取分类资源数量失败，使用默认值0", { error: countError });
        categories = categories.map(cat => ({
          ...cat,
          resource_count: 0
        }));
      }
    }

    return categories;
  });
}

// 获取分类树形结构
export async function getCategoriesTree(): Promise<CategoryWithChildren[]> {
  return withRetry(async () => {
    const categories = await getAllCategories();
    return buildCategoryTree(categories);
  });
}

// 构建分类树形结构
export function buildCategoryTree(categories: Category[]): CategoryWithChildren[] {
  const categoryMap = new Map<number, CategoryWithChildren>();
  const rootCategories: CategoryWithChildren[] = [];

  // 创建分类映射
  categories.forEach(category => {
    categoryMap.set(category.id!, { ...category, children: [] });
  });

  // 构建树形结构
  categories.forEach(category => {
    const categoryNode = categoryMap.get(category.id!)!;
    
    if (category.parent_id) {
      const parent = categoryMap.get(category.parent_id);
      if (parent) {
        parent.children!.push(categoryNode);
      }
    } else {
      rootCategories.push(categoryNode);
    }
  });

  return rootCategories;
}

// 获取单个分类
export async function getCategoryById(id: number): Promise<Category | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("获取分类失败", error, { id });
      throw error;
    }

    return data;
  });
}

// 别名函数，用于API兼容性
export const findCategoryById = getCategoryById;

// 根据分类名称查找分类
export async function findCategoryByName(name: string): Promise<Category | undefined> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("name", name.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return undefined;
      }
      log.error("根据名称获取分类失败", error, { name });
      throw error;
    }

    return data;
  });
}

// 创建分类
export async function createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .insert(category)
      .select()
      .single();

    if (error) {
      log.error("创建分类失败", error, { category });
      throw error;
    }

    log.info("分类创建成功", { categoryId: data.id, name: category.name });
    return data;
  });
}

// 更新分类
export async function updateCategory(id: number, updates: Partial<Category>): Promise<Category> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      log.error("更新分类失败", error, { id, updates });
      throw error;
    }

    log.info("分类更新成功", { id, updates: Object.keys(updates) });
    return data;
  });
}

// 删除分类
export async function deleteCategory(id: number): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    // 检查是否有子分类
    const { data: children, error: childrenError } = await supabase
      .from("categories")
      .select("id")
      .eq("parent_id", id);

    if (childrenError) {
      log.error("检查子分类失败", childrenError, { id });
      throw childrenError;
    }

    if (children && children.length > 0) {
      throw new Error("无法删除包含子分类的分类");
    }

    // 检查是否有关联的资源
    const { data: resources, error: resourcesError } = await supabase
      .from("resources")
      .select("id")
      .eq("category_id", id);

    if (resourcesError) {
      log.error("检查关联资源失败", resourcesError, { id });
      throw resourcesError;
    }

    if (resources && resources.length > 0) {
      throw new Error("无法删除包含资源的分类");
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      log.error("删除分类失败", error, { id });
      throw error;
    }

    log.info("分类删除成功", { id });
  });
}

// 获取分类的资源数量
export async function getCategoryResourceCount(categoryId: number): Promise<number> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from("resources")
      .select("*", { count: 'exact', head: true })
      .eq("category_id", categoryId)
      .eq("status", "approved");

    if (error) {
      log.error("获取分类资源数量失败", error, { categoryId });
      throw error;
    }

    return count || 0;
  });
}

// 批量获取所有分类的资源数量，避免N+1查询
export async function getAllCategoriesResourceCount(): Promise<{ [categoryId: number]: number }> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();

    // 直接查询资源表，按分类ID分组统计数量
    const { data, error } = await supabase
      .from('resources')
      .select('category_id')
      .eq('status', 'approved');

    if (error) {
      log.error("批量获取分类资源数量失败", error);
      log.warn("批量获取分类资源数量失败，使用默认值0", { error });
      return {};
    }

    // 在内存中统计每个分类的资源数量
    const countMap: { [categoryId: number]: number } = {};
    (data || []).forEach((resource) => {
      const categoryId = resource.category_id;
      if (categoryId) {
        countMap[categoryId] = (countMap[categoryId] || 0) + 1;
      }
    });

    log.info("批量获取分类资源数量成功", { categoriesCount: Object.keys(countMap).length });
    return countMap;
  });
}

// 获取热门分类（按资源数量排序）
export async function getPopularCategories(limit: number = 10): Promise<Category[]> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("categories")
      .select(`
        *,
        resource_count:resources(count)
      `)
      .order("resource_count", { ascending: false })
      .limit(limit);

    if (error) {
      log.error("获取热门分类失败", error);
      throw error;
    }

    return data || [];
  });
}

// 更新分类排序
export async function updateCategoryOrder(categoryOrders: { id: number; sort_order: number }[]): Promise<void> {
  return withRetry(async () => {
    const supabase = getSupabaseClient();
    
    for (const { id, sort_order } of categoryOrders) {
      const { error } = await supabase
        .from("categories")
        .update({ sort_order })
        .eq("id", id);

      if (error) {
        log.error("更新分类排序失败", error, { id, sort_order });
        throw error;
      }
    }

    log.info("分类排序更新成功", { count: categoryOrders.length });
  });
}

// 获取分类路径（面包屑导航用）
export async function getCategoryPath(categoryId: number): Promise<Category[]> {
  return withRetry(async () => {
    const categories = await getAllCategories();
    const categoryMap = new Map<number, Category>();
    
    categories.forEach(category => {
      categoryMap.set(category.id!, category);
    });

    const path: Category[] = [];
    let currentId: number | undefined = categoryId;

    while (currentId) {
      const category = categoryMap.get(currentId);
      if (!category) break;
      
      path.unshift(category);
      currentId = category.parent_id;
    }

    return path;
  });
}
