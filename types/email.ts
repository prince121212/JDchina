/**
 * 邮件相关类型定义
 * Email Types Definition
 */

export enum EmailType {
  WELCOME = 'welcome',
  ORDER_CONFIRMATION = 'order_confirmation',
  PASSWORD_RESET = 'password_reset',
  API_KEY_NOTIFICATION = 'api_key_notification',
  CREDITS_NOTIFICATION = 'credits_notification',
  INVITE_REWARD = 'invite_reward',
  SYSTEM_NOTIFICATION = 'system_notification',
  CUSTOM = 'custom',
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}
