import { respData } from "@/lib/resp";

// GET /api/my-reviews - 返回空的评论列表（功能已移除）
export async function GET(req: Request) {
  // 系统不再支持用户管理自己的评论功能
  // 返回空列表以保持兼容性
  return respData({
    reviews: [],
    total: 0,
    message: "用户评论管理功能已移除"
  });
}
