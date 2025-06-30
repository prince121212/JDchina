"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PASSWORD_CONFIG } from "@/lib/constants";

interface ForgotPasswordFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function ForgotPasswordForm({ onBack, onSuccess }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理定时器的函数
  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 发送验证码
  const sendVerificationCode = async () => {
    if (!formData.email) {
      toast.error("请输入邮箱地址");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          type: 'reset_password',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("验证码已发送，请查收邮件");
        setStep('verify');
        startCountdown();
      } else {
        toast.error(data.error || "发送验证码失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  // 开始倒计时
  const startCountdown = () => {
    // 先清理之前的定时器
    clearTimer();

    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 重新发送验证码
  const resendCode = async () => {
    if (countdown > 0) return;
    await sendVerificationCode();
  };

  // 重置密码
  const resetPassword = async () => {
    if (!formData.verificationCode) {
      toast.error("请输入验证码");
      return;
    }

    if (!formData.newPassword || formData.newPassword.length < PASSWORD_CONFIG.MIN_LENGTH) {
      toast.error(`密码长度至少${PASSWORD_CONFIG.MIN_LENGTH}位`);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          verificationCode: formData.verificationCode,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("密码重置成功！");
        onSuccess();
      } else {
        toast.error(data.error || "密码重置失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {step === 'email' ? '忘记密码' : '重置密码'}
        </CardTitle>
        <CardDescription>
          {step === 'email' 
            ? '输入您的邮箱地址，我们将发送验证码' 
            : '输入验证码和新密码'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'email' ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入您的邮箱"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
            <Button 
              onClick={sendVerificationCode} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "发送中..." : "发送验证码"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="verificationCode">验证码</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="请输入6位验证码"
                value={formData.verificationCode}
                onChange={(e) => handleInputChange('verificationCode', e.target.value)}
                maxLength={6}
                required
              />
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  验证码已发送至 {formData.email}
                </span>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={countdown > 0}
                  className="text-primary hover:underline disabled:text-muted-foreground"
                >
                  {countdown > 0 ? `${countdown}s后重发` : '重新发送'}
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={`请输入新密码（至少${PASSWORD_CONFIG.MIN_LENGTH}位）`}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                required
              />
            </div>
            <Button 
              onClick={resetPassword} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "重置中..." : "重置密码"}
            </Button>
          </div>
        )}
        
        <Button variant="ghost" onClick={onBack} className="w-full mt-4">
          返回登录
        </Button>
      </CardContent>
    </Card>
  );
}
