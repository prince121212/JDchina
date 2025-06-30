"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { DEFAULT_AVATAR_URL, PASSWORD_CONFIG } from "@/lib/constants";
import { useAppContext } from "@/contexts/app";

interface EmailRegisterFormProps {
  onBack: () => void;
}

export default function EmailRegisterForm({ onBack }: EmailRegisterFormProps) {
  const t = useTranslations();
  const { setShowSignModal } = useAppContext();
  const [step, setStep] = useState<'email' | 'verify' | 'complete'>('email');
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    verificationCode: '',
    inviteCode: '',
  });
  const [countdown, setCountdown] = useState(0);

  // 处理注册成功后的操作
  useEffect(() => {
    if (registerSuccess) {
      const timer = setTimeout(() => {
        setShowSignModal(false);
        window.location.href = '/';
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [registerSuccess, setShowSignModal]);

  // 发送验证码
  const sendVerificationCode = async () => {
    if (!formData.email) {
      toast.error("请输入邮箱地址");
      return;
    }

    if (!formData.password || formData.password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      toast.error(`密码长度至少${PASSWORD_CONFIG.MIN_LENGTH}位`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (!formData.nickname || formData.nickname.length < 1) {
      toast.error("请输入昵称");
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
          type: 'register',
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
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
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

  // 完成注册
  const completeRegistration = async () => {
    if (!formData.verificationCode) {
      toast.error("请输入验证码");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/email-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname,
          verificationCode: formData.verificationCode,
          inviteCode: formData.inviteCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("注册成功！正在登录...");
        setStep('complete');

        // 自动登录
        const result = await signIn('email', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        console.log('注册后自动登录结果:', result);

        if (result?.ok && !result?.error) {
          setRegisterSuccess(true);
        } else {
          toast.error("自动登录失败，请手动登录");
          setTimeout(() => onBack(), 1000);
        }
      } else {
        toast.error(data.error || "注册失败");
      }
    } catch (error) {
      toast.error("网络错误，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {step === 'email' && '邮箱注册'}
          {step === 'verify' && '验证邮箱'}
          {step === 'complete' && '注册完成'}
        </CardTitle>
        <CardDescription>
          {step === 'email' && '创建您的新账户'}
          {step === 'verify' && '请输入发送到您邮箱的验证码'}
          {step === 'complete' && '正在为您登录...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {step === 'email' && (
            <>
              {/* 头像预览 */}
              <div className="flex justify-center mb-4">
                <div className="text-center">
                  <img
                    src={DEFAULT_AVATAR_URL}
                    alt="默认头像"
                    className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-gray-200"
                  />
                  <p className="text-xs text-muted-foreground">您的默认头像</p>
                </div>
              </div>

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
              <div className="grid gap-2">
                <Label htmlFor="nickname">昵称</Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="请输入您的昵称"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码（至少8位）"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="请再次输入密码"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inviteCode">邀请码（可选）</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="如有邀请码请输入"
                  value={formData.inviteCode}
                  onChange={(e) => handleInputChange('inviteCode', e.target.value)}
                />
              </div>
              <Button 
                onClick={sendVerificationCode} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "发送中..." : "发送验证码"}
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="text-center text-sm text-muted-foreground mb-4">
                验证码已发送至：<strong>{formData.email}</strong>
              </div>
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
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={completeRegistration} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "注册中..." : "完成注册"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={resendCode}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `${countdown}s` : "重发"}
                </Button>
              </div>
            </>
          )}

          {step === 'complete' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">正在为您登录...</p>
            </div>
          )}

          <Button variant="ghost" onClick={onBack} className="w-full">
            返回登录
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
