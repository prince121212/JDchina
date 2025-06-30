/**
 * 交易类型映射表
 * 统一管理所有交易类型的中文显示名称
 */
export const TRANSACTION_TYPE_MAP: Record<string, string> = {
  'new_user': '新用户奖励',
  'order_pay': '充值',
  'system_add': '系统赠送',
  'ping': 'API测试',
  'resource_access': '访问资源',
  'upload_reward': '上传奖励',
  'daily_signin': '每日签到',
  'invite_reward': '邀请奖励',
  'refund': '退款',
  'admin_adjust': '管理员调整',
} as const;

/**
 * 获取交易类型的中文显示名称
 * @param transType 交易类型
 * @returns 中文显示名称，如果未找到则返回原始类型
 */
export function getTransactionTypeText(transType: string): string {
  return TRANSACTION_TYPE_MAP[transType] || transType;
}

/**
 * 检查是否为资源访问类型的交易
 * @param transType 交易类型
 * @returns 是否为资源访问类型
 */
export function isResourceAccessTransaction(transType: string): boolean {
  return transType === 'resource_access';
}