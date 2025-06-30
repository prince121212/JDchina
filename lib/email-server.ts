/**
 * 服务端邮件服务
 * Server-side Email Service
 * 
 * 这个文件只在服务端运行，避免客户端导入 nodemailer
 */

import { EmailType } from '@/types/email';
import { log } from '@/lib/logger';

// 动态导入邮件服务，避免在客户端加载
export async function sendEmailServer(options: {
  type: EmailType;
  to: string;
  subject?: string;
  content?: string;
  html?: string;
  data?: any;
}) {
  try {
    // 动态导入邮件服务
    const { emailService } = await import('@/services/email');
    
    switch (options.type) {
      case EmailType.WELCOME:
        return await emailService.sendWelcomeEmail(options.to, options.data?.userName);
        
      case EmailType.ORDER_CONFIRMATION:
        if (!options.data?.orderNo || !options.data?.amount || !options.data?.credits) {
          throw new Error('订单确认邮件参数不完整');
        }
        return await emailService.sendOrderConfirmationEmail(options.to, {
          orderNo: options.data.orderNo,
          amount: options.data.amount,
          credits: options.data.credits,
          userName: options.data.userName,
        });
        
      case EmailType.PASSWORD_RESET:
        if (!options.data?.resetLink) {
          throw new Error('密码重置邮件参数不完整');
        }
        return await emailService.sendPasswordResetEmail(
          options.to,
          options.data.resetLink,
          options.data?.userName
        );
        
      case EmailType.API_KEY_NOTIFICATION:
        if (!options.data?.apiKeyName) {
          throw new Error('API密钥通知邮件参数不完整');
        }
        return await emailService.sendApiKeyNotificationEmail(
          options.to,
          options.data.apiKeyName,
          options.data?.userName
        );
        
      case EmailType.CREDITS_NOTIFICATION:
        if (!options.data?.amount || !options.data?.type || !options.data?.balance) {
          throw new Error('积分通知邮件参数不完整');
        }
        return await emailService.sendCreditsNotificationEmail(options.to, {
          amount: options.data.amount,
          type: options.data.type,
          balance: options.data.balance,
          userName: options.data.userName,
        });
        
      case EmailType.INVITE_REWARD:
        if (!options.data?.inviteeEmail || !options.data?.rewardCredits) {
          throw new Error('邀请奖励邮件参数不完整');
        }
        return await emailService.sendInviteRewardEmail(options.to, {
          inviteeEmail: options.data.inviteeEmail,
          rewardCredits: options.data.rewardCredits,
          userName: options.data.userName,
        });
        
      case EmailType.SYSTEM_NOTIFICATION:
        if (!options.data?.title || !options.data?.content) {
          throw new Error('系统通知邮件参数不完整');
        }
        return await emailService.sendSystemNotificationEmail(
          options.to,
          options.data.title,
          options.data.content
        );
        
      case EmailType.CUSTOM:
        if (!options.subject) {
          throw new Error('自定义邮件参数不完整');
        }
        return await emailService.sendCustomEmail({
          to: options.to,
          subject: options.subject,
          text: options.content,
          html: options.html,
        });
        
      default:
        throw new Error('不支持的邮件类型');
    }
  } catch (error) {
    log.error('服务端邮件发送失败', error as Error, {
      type: options.type,
      to: options.to,
      subject: options.subject
    });
    throw error;
  }
}

// 测试SMTP邮件服务
export async function testEmailServiceServer() {
  try {
    // 动态导入测试函数
    const { testEmailService } = await import('@/lib/wework-email');
    return await testEmailService();
  } catch (error) {
    log.error('SMTP邮件服务测试失败', error as Error);
    throw error;
  }
}
