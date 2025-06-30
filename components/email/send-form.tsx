"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { EmailType } from '@/types/email';

interface EmailSendFormProps {
  onSuccess?: () => void;
  defaultType?: EmailType;
  defaultTo?: string;
}

export function EmailSendForm({ onSuccess, defaultType, defaultTo }: EmailSendFormProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restrictToRegisteredUsers, setRestrictToRegisteredUsers] = useState(true);
  const [formData, setFormData] = useState({
    type: defaultType || EmailType.CUSTOM,
    to: defaultTo || '',
    subject: '',
    content: '',
    html: '',
    data: {} as any,
  });

  // 确保组件在客户端正确挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 在服务端渲染时返回加载状态
  if (!mounted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>邮件发送</CardTitle>
          <CardDescription>
            发送各种类型的邮件通知
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const emailTypes = [
    { value: EmailType.WELCOME, label: '欢迎邮件' },
    { value: EmailType.ORDER_CONFIRMATION, label: '订单确认邮件' },
    { value: EmailType.PASSWORD_RESET, label: '密码重置邮件' },
    { value: EmailType.API_KEY_NOTIFICATION, label: 'API密钥通知邮件' },
    { value: EmailType.CREDITS_NOTIFICATION, label: '积分通知邮件' },
    { value: EmailType.INVITE_REWARD, label: '邀请奖励邮件' },
    { value: EmailType.SYSTEM_NOTIFICATION, label: '系统通知邮件' },
    { value: EmailType.CUSTOM, label: '自定义邮件' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.to || !formData.type) {
      toast.error('请填写收件人和邮件类型');
      return;
    }

    if (formData.type === EmailType.CUSTOM && !formData.subject) {
      toast.error('自定义邮件需要填写主题');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          restrictToRegisteredUsers,
        }),
      });

      const result = await response.json();

      if (result.code === 0 && result.data?.success) {
        toast.success(result.data.message || '邮件发送成功');
        // 重置表单
        setFormData({
          type: EmailType.CUSTOM,
          to: '',
          subject: '',
          content: '',
          html: '',
          data: {},
        });
        onSuccess?.();
      } else {
        toast.error(result.message || '邮件发送失败');
      }
    } catch (error) {
      console.error('邮件发送异常:', error);
      toast.error('邮件发送异常');
    } finally {
      setLoading(false);
    }
  };

  const handleTestService = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'GET',
      });

      const result = await response.json();

      if (result.code === 0 && result.data?.success) {
        toast.success(result.data.message || '邮件服务测试完成');
        console.log('测试结果:', result.data.result);
      } else {
        toast.error(result.message || '邮件服务测试失败');
      }
    } catch (error) {
      console.error('邮件服务测试异常:', error);
      toast.error('邮件服务测试异常');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case EmailType.WELCOME:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="userName">用户名（可选）</Label>
              <Input
                id="userName"
                value={formData.data.userName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, userName: e.target.value }
                })}
                placeholder="用户显示名称"
              />
            </div>
          </div>
        );

      case EmailType.ORDER_CONFIRMATION:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="orderNo">订单号 *</Label>
              <Input
                id="orderNo"
                value={formData.data.orderNo || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, orderNo: e.target.value }
                })}
                placeholder="订单编号"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">支付金额 *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.data.amount || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, amount: parseFloat(e.target.value) || 0 }
                })}
                placeholder="支付金额（元）"
                required
              />
            </div>
            <div>
              <Label htmlFor="credits">获得积分 *</Label>
              <Input
                id="credits"
                type="number"
                value={formData.data.credits || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, credits: parseInt(e.target.value) || 0 }
                })}
                placeholder="获得的积分数量"
                required
              />
            </div>
          </div>
        );

      case EmailType.API_KEY_NOTIFICATION:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="apiKeyName">API密钥名称 *</Label>
              <Input
                id="apiKeyName"
                value={formData.data.apiKeyName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, apiKeyName: e.target.value }
                })}
                placeholder="API密钥的名称或标识"
                required
              />
            </div>
            <div>
              <Label htmlFor="userName">用户名（可选）</Label>
              <Input
                id="userName"
                value={formData.data.userName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, userName: e.target.value }
                })}
                placeholder="用户显示名称"
              />
            </div>
          </div>
        );

      case EmailType.PASSWORD_RESET:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="resetLink">重置链接 *</Label>
              <Input
                id="resetLink"
                value={formData.data.resetLink || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, resetLink: e.target.value }
                })}
                placeholder="密码重置链接"
                required
              />
            </div>
            <div>
              <Label htmlFor="userName">用户名（可选）</Label>
              <Input
                id="userName"
                value={formData.data.userName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, userName: e.target.value }
                })}
                placeholder="用户显示名称"
              />
            </div>
          </div>
        );

      case EmailType.CREDITS_NOTIFICATION:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">积分数量 *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.data.amount || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, amount: parseInt(e.target.value) || 0 }
                })}
                placeholder="积分变动数量"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">变动类型 *</Label>
              <Input
                id="type"
                value={formData.data.type || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, type: e.target.value }
                })}
                placeholder="积分变动类型（如：充值、消费、奖励等）"
                required
              />
            </div>
            <div>
              <Label htmlFor="balance">当前余额 *</Label>
              <Input
                id="balance"
                type="number"
                value={formData.data.balance || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, balance: parseInt(e.target.value) || 0 }
                })}
                placeholder="变动后的积分余额"
                required
              />
            </div>
            <div>
              <Label htmlFor="userName">用户名（可选）</Label>
              <Input
                id="userName"
                value={formData.data.userName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, userName: e.target.value }
                })}
                placeholder="用户显示名称"
              />
            </div>
          </div>
        );

      case EmailType.INVITE_REWARD:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="inviteeEmail">被邀请人邮箱 *</Label>
              <Input
                id="inviteeEmail"
                type="email"
                value={formData.data.inviteeEmail || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, inviteeEmail: e.target.value }
                })}
                placeholder="被邀请人的邮箱地址"
                required
              />
            </div>
            <div>
              <Label htmlFor="rewardCredits">奖励积分 *</Label>
              <Input
                id="rewardCredits"
                type="number"
                value={formData.data.rewardCredits || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, rewardCredits: parseInt(e.target.value) || 0 }
                })}
                placeholder="邀请奖励的积分数量"
                required
              />
            </div>
            <div>
              <Label htmlFor="userName">用户名（可选）</Label>
              <Input
                id="userName"
                value={formData.data.userName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, userName: e.target.value }
                })}
                placeholder="用户显示名称"
              />
            </div>
          </div>
        );

      case EmailType.SYSTEM_NOTIFICATION:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">通知标题 *</Label>
              <Input
                id="title"
                value={formData.data.title || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, title: e.target.value }
                })}
                placeholder="系统通知标题"
                required
              />
            </div>
            <div>
              <Label htmlFor="notificationContent">通知内容 *</Label>
              <Textarea
                id="notificationContent"
                value={formData.data.content || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  data: { ...formData.data, content: e.target.value }
                })}
                placeholder="系统通知内容（支持HTML）"
                rows={6}
                required
              />
            </div>
          </div>
        );

      case EmailType.CUSTOM:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">邮件主题 *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="邮件主题"
                required
              />
            </div>
            <div>
              <Label htmlFor="content">邮件内容（文本）</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="纯文本邮件内容"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="html">邮件内容（HTML）</Label>
              <Textarea
                id="html"
                value={formData.html}
                onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                placeholder="HTML格式邮件内容"
                rows={6}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>邮件发送</CardTitle>
        <CardDescription>
          发送各种类型的邮件通知
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">邮件类型 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  type: value as EmailType,
                  data: {} // 重置数据
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择邮件类型" />
                </SelectTrigger>
                <SelectContent>
                  {emailTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="to">收件人 *</Label>
              <Input
                id="to"
                type="email"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                placeholder="收件人邮箱地址"
                required
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label htmlFor="restrict-users" className="text-sm font-medium">
                  限制收件人为已注册用户
                </Label>
                <p className="text-xs text-muted-foreground">
                  开启后，只能向已注册的用户邮箱发送邮件
                </p>
              </div>
              <Switch
                id="restrict-users"
                checked={restrictToRegisteredUsers}
                onCheckedChange={setRestrictToRegisteredUsers}
              />
            </div>

            {renderTypeSpecificFields()}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? '发送中...' : '发送邮件'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleTestService}
              disabled={loading}
            >
              测试服务
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
