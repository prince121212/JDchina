"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  X,
  FileText,
  Image,
  Music,
  Video,
  Code,
  Database,
  Layout,
  BookOpen
} from "lucide-react";



interface ResourceFilterProps {
  onFilterChange?: (filters: any) => void;
  showAdvanced?: boolean;
  compact?: boolean;
}

export default function ResourceFilter({
  onFilterChange,
  showAdvanced = true,
  compact = false
}: ResourceFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tags")?.split(",").filter(Boolean) || []
  );

  const [isFreeOnly, setIsFreeOnly] = useState(searchParams.get("is_free") === "true");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "latest");

  // 动态数据
  const [categories, setCategories] = useState<any[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取分类和标签数据
  useEffect(() => {
    fetchCategories();
    fetchPopularTags();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?include_children=true&include_count=true');
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          setCategories(data.data.categories || []);
        }
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchPopularTags = async () => {
    try {
      const response = await fetch('/api/tags?type=popular&limit=20');
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          setPopularTags(data.data.tags?.map((tag: any) => tag.name) || []);
        }
      }
    } catch (error) {
      console.error('获取热门标签失败:', error);
    }
  };

  // 更新URL参数
  const updateFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));

    if (isFreeOnly) params.set("is_free", "true");
    if (sortBy !== "latest") params.set("sort", sortBy);

    const newUrl = `/resources?${params.toString()}`;
    router.push(newUrl);

    // 调用回调函数
    if (onFilterChange) {
      onFilterChange({
        search,
        category: selectedCategory,
        tags: selectedTags,

        is_free: isFreeOnly,
        sort: sortBy
      });
    }
  };

  // 清除所有筛选
  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedTags([]);
    setIsFreeOnly(false);
    setSortBy("latest");
    router.push("/resources");
  };

  // 处理标签选择
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };



  // 检查是否有活动筛选
  const hasActiveFilters = search || selectedCategory || selectedTags.length > 0 ||
                          isFreeOnly || sortBy !== "latest";

  // 获取选中分类的名称
  const getSelectedCategoryName = () => {
    if (!selectedCategory) return null;
    const category = categories.find(cat => cat.id.toString() === selectedCategory);
    return category?.name || null;
  };

  // 移除单个筛选项
  const removeFilter = (filterType: string, value?: string) => {
    switch (filterType) {
      case 'search':
        setSearch("");
        break;
      case 'category':
        setSelectedCategory("");
        break;
      case 'tag':
        if (value) {
          setSelectedTags(prev => prev.filter(tag => tag !== value));
        }
        break;

      case 'isFree':
        setIsFreeOnly(false);
        break;
      case 'sort':
        setSortBy("latest");
        break;
    }
  };

  // 监听筛选条件变化，自动更新URL（除了初始加载）
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) {
      updateFilters();
    } else {
      setIsInitialized(true);
    }
  }, [search, selectedCategory, selectedTags, isFreeOnly, sortBy]);

  // 分类项组件
  const CategoryItem = ({
    category,
    selectedCategory,
    onCategorySelect,
    level = 0
  }: {
    category: any;
    selectedCategory: string;
    onCategorySelect: (id: string) => void;
    level: number;
  }) => {
    const isSelected = selectedCategory === category.id.toString();
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div>
        <Button
          variant={isSelected ? "default" : "ghost"}
          className={`w-full justify-start ${level > 0 ? 'ml-4 text-sm' : ''}`}
          onClick={() => onCategorySelect(
            isSelected ? "" : category.id.toString()
          )}
        >
          {level > 0 && <span className="mr-2">└</span>}
          <FileText className="h-4 w-4 mr-2" />
          {category.name}
          {category.resource_count !== undefined && (
            <span className="ml-auto text-xs text-muted-foreground">
              {category.resource_count}
            </span>
          )}
        </Button>

        {hasChildren && (
          <div className="mt-1">
            {category.children.map((child: any) => (
              <CategoryItem
                key={child.id}
                category={child}
                selectedCategory={selectedCategory}
                onCategorySelect={onCategorySelect}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // 紧凑模式 - 按照原型图的横向布局
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          {/* 搜索框 - 参考原型图样式 */}
          <div className="relative flex-1">
            <Input
              placeholder="搜索资源..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateFilters()}
              className="w-full pl-10 h-12 border-2 focus:border-primary transition-all"
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* 分类筛选 - 参考原型图样式 */}
          <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
            <SelectTrigger className="lg:w-auto h-12 border-2 min-w-[140px]">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 排序 - 参考原型图样式 */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="lg:w-auto h-12 border-2 min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">最新上传</SelectItem>
              <SelectItem value="popular">最多下载</SelectItem>
              <SelectItem value="rating">评分最高</SelectItem>
              <SelectItem value="views">名称排序</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={updateFilters}
            className="h-12 px-6 shadow-sm hover:shadow-md transition-all"
          >
            搜索
          </Button>
        </div>

        {/* 当前筛选项显示 */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">当前筛选:</span>

            {/* 搜索词 */}
            {search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                搜索: {search}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('search')}
                />
              </Badge>
            )}

            {/* 分类 */}
            {selectedCategory && (
              <Badge variant="secondary" className="flex items-center gap-1">
                分类: {getSelectedCategoryName() || selectedCategory}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('category')}
                />
              </Badge>
            )}

            {/* 标签 */}
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                标签: {tag}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('tag', tag)}
                />
              </Badge>
            ))}



            {/* 免费筛选 */}
            {isFreeOnly && (
              <Badge variant="secondary" className="flex items-center gap-1">
                仅免费资源
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('isFree')}
                />
              </Badge>
            )}

            {/* 排序（如果不是默认排序） */}
            {sortBy !== "latest" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                排序: {
                  sortBy === "popular" ? "最多下载" :
                  sortBy === "rating" ? "评分最高" :
                  sortBy === "views" ? "名称排序" : sortBy
                }
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeFilter('sort')}
                />
              </Badge>
            )}

            {/* 清除所有筛选 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearFilters();
              }}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              清除所有
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索框 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            搜索资源
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="输入关键词搜索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateFilters()}
            />
            <Button onClick={updateFilters}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* 当前筛选项显示（简化版） */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
              {search && (
                <Badge variant="outline" className="text-xs">
                  搜索: {search}
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="outline" className="text-xs">
                  分类: {getSelectedCategoryName() || selectedCategory}
                </Badge>
              )}
              {selectedTags.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  标签: {selectedTags.length}个
                </Badge>
              )}

              {isFreeOnly && (
                <Badge variant="outline" className="text-xs">
                  仅免费
                </Badge>
              )}
              {sortBy !== "latest" && (
                <Badge variant="outline" className="text-xs">
                  {sortBy === "popular" ? "最多下载" :
                   sortBy === "rating" ? "最高评分" :
                   sortBy === "views" ? "最多浏览" : sortBy}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 排序 */}
      <Card>
        <CardHeader>
          <CardTitle>排序方式</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">最新发布</SelectItem>
              <SelectItem value="popular">最多下载</SelectItem>
              <SelectItem value="rating">最高评分</SelectItem>
              <SelectItem value="views">最多浏览</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 分类筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>资源分类</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant={selectedCategory === "" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedCategory("")}
            >
              全部分类
            </Button>
            {categories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                level={0}
              />
            ))}
          </div>
        </CardContent>
      </Card>



      {/* 积分筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>积分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="free-only"
              checked={isFreeOnly}
              onCheckedChange={(checked) => setIsFreeOnly(checked === true)}
            />
            <Label htmlFor="free-only" className="text-sm">
              仅显示免费资源
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* 热门标签 */}
      <Card>
        <CardHeader>
          <CardTitle>热门标签</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 应用筛选和清除按钮 */}
      <div className="space-y-2">
        <Button onClick={updateFilters} className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          应用筛选
        </Button>
        
        {hasActiveFilters && (
          <Button onClick={clearFilters} variant="outline" className="w-full">
            <X className="h-4 w-4 mr-2" />
            清除筛选
          </Button>
        )}
      </div>

      {/* 活动筛选显示 */}
      {hasActiveFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">当前筛选</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {search && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">搜索:</span>
                  <Badge variant="secondary">{search}</Badge>
                </div>
              )}
              {selectedCategory && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">分类:</span>
                  <Badge variant="secondary">
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </Badge>
                </div>
              )}
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">标签:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {isFreeOnly && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">价格:</span>
                  <Badge variant="secondary">仅免费</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
