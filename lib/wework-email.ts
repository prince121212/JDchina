/**
 * 企业微信SMTP邮件服务
 * WeWork Enterprise SMTP Email Service
 */

import { log } from '@/lib/logger';

// 环境变量配置
const config = {
  senderEmail: process.env.WEWORK_SENDER_EMAIL || '',
  senderName: process.env.WEWORK_SENDER_NAME || 'pc-t',
};

/**
 * 邮件发送接口
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
}



/**
 * 使用SMTP发送邮件（主方案，暂时不引入企业微信应用消息，虽然企业微信应用消息更即时但是用户很难会同意加入企业微信应用）
 */
export async function sendSMTPEmail(options: EmailOptions): Promise<boolean> {
  try {
    // 动态导入nodemailer以避免在不需要时加载
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || config.senderEmail,
        pass: process.env.SMTP_PASS || '',
      },
    });

    const mailOptions = {
      from: `${options.fromName || config.senderName} <${options.from || config.senderEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const result = await transporter.sendMail(mailOptions);
    log.info('SMTP邮件发送成功', { messageId: result.messageId, to: options.to, subject: options.subject });
    return true;
  } catch (error) {
    log.error('SMTP邮件发送失败', error as Error, { to: options.to, subject: options.subject });
    return false;
  }
}

/**
 * SMTP邮件发送
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // 验证必要参数
  if (!options.to || !options.subject) {
    log.error('邮件发送失败: 缺少必要参数', undefined, { to: options.to, subject: options.subject });
    return false;
  }

  // 使用SMTP邮件发送
  if (process.env.SMTP_PASS) {
    return await sendSMTPEmail(options);
  }

  log.error('邮件发送失败: 未配置SMTP邮件服务', undefined, { to: options.to, subject: options.subject });
  return false;
}

/**
 * 测试SMTP邮件服务连接
 */
export async function testEmailService(): Promise<{
  smtp: boolean;
  message: string;
}> {
  const result = {
    smtp: false,
    message: '',
  };

  // 测试SMTP
  try {
    if (process.env.SMTP_PASS) {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.exmail.qq.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || config.senderEmail,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.verify();
      result.smtp = true;
      result.message += 'SMTP连接正常; ';
    } else {
      result.message += 'SMTP配置缺失; ';
    }
  } catch (error) {
    const errorMessage = `SMTP连接失败: ${error}`;
    result.message += `${errorMessage}; `;
    log.error('SMTP连接测试失败', error as Error);
  }

  return result;
}
