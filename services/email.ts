/**
 * 邮件服务封装类
 * Email Service Wrapper
 */

import { sendEmail, EmailOptions } from '@/lib/wework-email';
import { EmailType, EmailTemplate } from '@/types/email';
import { log } from '@/lib/logger';

// 重新导出类型，保持向后兼容
export type { EmailType, EmailTemplate };

export class EmailService {
  private static instance: EmailService;
  private readonly baseUrl: string;
  private readonly siteName: string;

  constructor() {
    // 优先使用配置的 WEB_URL，如果是本地开发环境则使用生产域名
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
    const isLocalDev = webUrl.includes('localhost') || webUrl.includes('127.0.0.1');
    this.baseUrl = isLocalDev ? "https://wm985.top" : webUrl;
    this.siteName = process.env.NEXT_PUBLIC_PROJECT_NAME || 'pc-t';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(to: string, userName?: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(userName);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送订单确认邮件
   */
  async sendOrderConfirmationEmail(
    to: string,
    orderData: {
      orderNo: string;
      amount: number;
      credits: number;
      userName?: string;
    }
  ): Promise<boolean> {
    const template = this.getOrderConfirmationTemplate(orderData);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    userName?: string
  ): Promise<boolean> {
    const template = this.getPasswordResetTemplate(resetLink, userName);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送API密钥通知邮件
   */
  async sendApiKeyNotificationEmail(
    to: string,
    apiKeyName: string,
    userName?: string
  ): Promise<boolean> {
    const template = this.getApiKeyNotificationTemplate(apiKeyName, userName);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送积分通知邮件
   */
  async sendCreditsNotificationEmail(
    to: string,
    creditsData: {
      amount: number;
      type: string;
      balance: number;
      userName?: string;
    }
  ): Promise<boolean> {
    const template = this.getCreditsNotificationTemplate(creditsData);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送邀请奖励邮件
   */
  async sendInviteRewardEmail(
    to: string,
    rewardData: {
      inviteeEmail: string;
      rewardCredits: number;
      userName?: string;
    }
  ): Promise<boolean> {
    const template = this.getInviteRewardTemplate(rewardData);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送系统通知邮件
   */
  async sendSystemNotificationEmail(
    to: string | string[],
    title: string,
    content: string
  ): Promise<boolean> {
    const template = this.getSystemNotificationTemplate(title, content);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送邮箱验证码邮件
   */
  async sendVerificationCodeEmail(
    to: string,
    code: string,
    type: 'register' | 'reset_password' | 'change_email',
    userName?: string
  ): Promise<boolean> {
    const template = this.getVerificationCodeTemplate(code, type, userName);
    return this.sendEmailSafely({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * 发送自定义邮件
   */
  async sendCustomEmail(options: EmailOptions): Promise<boolean> {
    return this.sendEmailSafely(options);
  }

  /**
   * 安全发送邮件（带错误处理）
   */
  private async sendEmailSafely(options: EmailOptions): Promise<boolean> {
    try {
      const result = await sendEmail(options);
      if (result) {
        log.info("邮件发送成功", {
          subject: options.subject,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to
        });
      } else {
        log.error("邮件发送失败", undefined, {
          subject: options.subject,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to
        });
      }
      return result;
    } catch (error) {
      log.error("邮件发送异常", error as Error, {
        subject: options.subject,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to
      });
      return false;
    }
  }

  /**
   * 获取欢迎邮件模板
   */
  private getWelcomeTemplate(userName?: string): EmailTemplate {
    const displayName = userName || '用户';
    return {
      subject: `欢迎加入 ${this.siteName}！`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">欢迎加入 ${this.siteName}！</h2>
          <p>亲爱的 ${displayName}，</p>
          <p>感谢您注册 ${this.siteName}！我们很高兴您加入我们的社区。</p>
          <p>您已经获得了初始积分，可以开始使用我们的服务了。</p>
          <div style="margin: 20px 0;">
            <a href="${this.baseUrl}" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              开始使用
            </a>
          </div>
          <p>如果您有任何问题，请随时联系我们。</p>
          <p>祝您使用愉快！</p>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `欢迎加入 ${this.siteName}！\n\n亲爱的 ${displayName}，\n\n感谢您注册 ${this.siteName}！我们很高兴您加入我们的社区。\n\n您已经获得了初始积分，可以开始使用我们的服务了。\n\n访问链接: ${this.baseUrl}\n\n如果您有任何问题，请随时联系我们。\n\n祝您使用愉快！\n\n${this.siteName} 团队`,
    };
  }

  /**
   * 获取订单确认邮件模板
   */
  private getOrderConfirmationTemplate(orderData: {
    orderNo: string;
    amount: number;
    credits: number;
    userName?: string;
  }): EmailTemplate {
    const displayName = orderData.userName || '用户';
    return {
      subject: `订单确认 - ${orderData.orderNo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">订单确认</h2>
          <p>亲爱的 ${displayName}，</p>
          <p>您的订单已经支付成功！</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0;">订单详情</h3>
            <p><strong>订单号:</strong> ${orderData.orderNo}</p>
            <p><strong>支付金额:</strong> ¥${orderData.amount}</p>
            <p><strong>获得积分:</strong> ${orderData.credits}</p>
          </div>
          <p>积分已经添加到您的账户中，您可以立即开始使用。</p>
          <div style="margin: 20px 0;">
            <a href="${this.baseUrl}/my-orders" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              查看订单
            </a>
          </div>
          <p>感谢您的支持！</p>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `订单确认 - ${orderData.orderNo}\n\n亲爱的 ${displayName}，\n\n您的订单已经支付成功！\n\n订单详情:\n订单号: ${orderData.orderNo}\n支付金额: ¥${orderData.amount}\n获得积分: ${orderData.credits}\n\n积分已经添加到您的账户中，您可以立即开始使用。\n\n查看订单: ${this.baseUrl}/my-orders\n\n感谢您的支持！\n\n${this.siteName} 团队`,
    };
  }

  /**
   * 获取密码重置邮件模板
   */
  private getPasswordResetTemplate(resetLink: string, userName?: string): EmailTemplate {
    const displayName = userName || '用户';
    return {
      subject: `${this.siteName} - 密码重置`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">密码重置</h2>
          <p>亲爱的 ${displayName}，</p>
          <p>我们收到了您的密码重置请求。</p>
          <p>请点击下面的链接重置您的密码：</p>
          <div style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              重置密码
            </a>
          </div>
          <p>如果您没有请求密码重置，请忽略此邮件。</p>
          <p>此链接将在24小时后失效。</p>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `${this.siteName} - 密码重置\n\n亲爱的 ${displayName}，\n\n我们收到了您的密码重置请求。\n\n请访问以下链接重置您的密码:\n${resetLink}\n\n如果您没有请求密码重置，请忽略此邮件。\n\n此链接将在24小时后失效。\n\n${this.siteName} 团队`,
    };
  }

  /**
   * 获取API密钥通知邮件模板
   */
  private getApiKeyNotificationTemplate(apiKeyName: string, userName?: string): EmailTemplate {
    const displayName = userName || '用户';
    return {
      subject: `API密钥创建通知 - ${apiKeyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">API密钥创建通知</h2>
          <p>亲爱的 ${displayName}，</p>
          <p>您已成功创建了一个新的API密钥：</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>密钥名称:</strong> ${apiKeyName}</p>
            <p><strong>创建时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
          </div>
          <p>请妥善保管您的API密钥，不要与他人分享。</p>
          <div style="margin: 20px 0;">
            <a href="${this.baseUrl}/api-keys" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              管理API密钥
            </a>
          </div>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `API密钥创建通知 - ${apiKeyName}\n\n亲爱的 ${displayName}，\n\n您已成功创建了一个新的API密钥：\n\n密钥名称: ${apiKeyName}\n创建时间: ${new Date().toLocaleString('zh-CN')}\n\n请妥善保管您的API密钥，不要与他人分享。\n\n管理API密钥: ${this.baseUrl}/api-keys\n\n${this.siteName} 团队`,
    };
  }

  /**
   * 获取积分通知邮件模板
   */
  private getCreditsNotificationTemplate(creditsData: {
    amount: number;
    type: string;
    balance: number;
    userName?: string;
  }): EmailTemplate {
    const displayName = creditsData.userName || '用户';
    const isIncrease = creditsData.amount > 0;
    const action = isIncrease ? '获得' : '消费';
    
    return {
      subject: `积分${action}通知`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">积分${action}通知</h2>
          <p>亲爱的 ${displayName}，</p>
          <p>您的积分账户有新的变动：</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>${action}积分:</strong> ${Math.abs(creditsData.amount)}</p>
            <p><strong>变动类型:</strong> ${creditsData.type}</p>
            <p><strong>当前余额:</strong> ${creditsData.balance}</p>
            <p><strong>时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
          </div>
          <div style="margin: 20px 0;">
            <a href="${this.baseUrl}/credits" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              查看积分详情
            </a>
          </div>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `积分${action}通知\n\n亲爱的 ${displayName}，\n\n您的积分账户有新的变动：\n\n${action}积分: ${Math.abs(creditsData.amount)}\n变动类型: ${creditsData.type}\n当前余额: ${creditsData.balance}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n查看积分详情: ${this.baseUrl}/credits\n\n${this.siteName} 团队`,
    };
  }

  /**
   * 获取邀请奖励邮件模板
   */
  private getInviteRewardTemplate(rewardData: {
    inviteeEmail: string;
    rewardCredits: number;
    userName?: string;
  }): EmailTemplate {
    const displayName = rewardData.userName || '用户';
    return {
      subject: `邀请奖励到账通知`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">邀请奖励到账通知</h2>
          <p>亲爱的 ${displayName}，</p>
          <p>恭喜您！您邀请的用户已成功注册并完成首次付费。</p>
          <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p><strong>被邀请用户:</strong> ${rewardData.inviteeEmail}</p>
            <p><strong>奖励积分:</strong> ${rewardData.rewardCredits}</p>
            <p><strong>到账时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
          </div>
          <p>继续邀请更多朋友，获得更多奖励！</p>
          <div style="margin: 20px 0;">
            <a href="${this.baseUrl}/my-invites" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              查看邀请记录
            </a>
          </div>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `邀请奖励到账通知\n\n亲爱的 ${displayName}，\n\n恭喜您！您邀请的用户已成功注册并完成首次付费。\n\n被邀请用户: ${rewardData.inviteeEmail}\n奖励积分: ${rewardData.rewardCredits}\n到账时间: ${new Date().toLocaleString('zh-CN')}\n\n继续邀请更多朋友，获得更多奖励！\n\n查看邀请记录: ${this.baseUrl}/my-invites\n\n${this.siteName} 团队`,
    };
  }

  /**
   * 获取邮箱验证码邮件模板
   */
  private getVerificationCodeTemplate(
    code: string,
    type: 'register' | 'reset_password' | 'change_email',
    userName?: string
  ): EmailTemplate {
    const displayName = userName || '用户';
    let title = '';
    let content = '';

    switch (type) {
      case 'register':
        title = '邮箱注册验证';
        content = `
          <p>亲爱的 ${displayName}，</p>
          <p>感谢您注册 ${this.siteName}！请使用以下验证码完成注册：</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
            <h1 style="color: #007cba; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>验证码有效期为15分钟，请尽快完成验证。</p>
          <p>如果您没有注册 ${this.siteName}，请忽略此邮件。</p>
        `;
        break;
      case 'reset_password':
        title = '密码重置验证';
        content = `
          <p>亲爱的 ${displayName}，</p>
          <p>我们收到了您的密码重置请求。请使用以下验证码重置密码：</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
            <h1 style="color: #007cba; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>验证码有效期为15分钟，请尽快完成验证。</p>
          <p>如果您没有请求密码重置，请忽略此邮件。</p>
        `;
        break;
      case 'change_email':
        title = '邮箱变更验证';
        content = `
          <p>亲爱的 ${displayName}，</p>
          <p>我们收到了您的邮箱变更请求。请使用以下验证码确认变更：</p>
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
            <h1 style="color: #007cba; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>验证码有效期为15分钟，请尽快完成验证。</p>
          <p>如果您没有请求邮箱变更，请忽略此邮件。</p>
        `;
        break;
    }

    return {
      subject: `${this.siteName} - ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          ${content}
          <p>如果您有任何问题，请随时联系我们。</p>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `${this.siteName} - ${title}\n\n${content.replace(/<[^>]*>/g, '')}\n\n如果您有任何问题，请随时联系我们。\n\n${this.siteName} 团队`,
    };
  }

  /**
   * 获取系统通知邮件模板
   */
  private getSystemNotificationTemplate(title: string, content: string): EmailTemplate {
    return {
      subject: `${this.siteName} - ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <div style="line-height: 1.6;">
            ${content}
          </div>
          <div style="margin: 20px 0;">
            <a href="${this.baseUrl}" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              访问网站
            </a>
          </div>
          <p>${this.siteName} 团队</p>
        </div>
      `,
      text: `${this.siteName} - ${title}\n\n${content.replace(/<[^>]*>/g, '')}\n\n访问网站: ${this.baseUrl}\n\n${this.siteName} 团队`,
    };
  }
}

// 导出单例实例
export const emailService = EmailService.getInstance();
