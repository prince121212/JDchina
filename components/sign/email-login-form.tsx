"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { useAppContext } from "@/contexts/app";

interface EmailLoginFormProps {
  onBack: () => void;
  onRegister: () => void;
  onForgotPassword: () => void;
}

export default function EmailLoginForm({ onBack, onRegister, onForgotPassword }: EmailLoginFormProps) {
  const t = useTranslations();
  const { setShowSignModal } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // 处理登录成功后的操作
  useEffect(() => {
    if (loginSuccess) {
      const timer = setTimeout(() => {
        setShowSignModal(false);
        window.location.href = '/';
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [loginSuccess, setShowSignModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("请填写完整信息");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('email', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      console.log('登录结果:', result);

      // 对于 CredentialsProvider，需要检查 error 字段
      if (result?.ok && !result?.error) {
        toast.success("登录成功！");
        setLoginSuccess(true);
      } else {
        // 根据错误类型显示不同的错误信息
        if (result?.error === 'CredentialsSignin') {
          toast.error("邮箱或密码错误，请检查后重试");
        } else {
          toast.error("登录失败，请稍后再试");
        }
      }
    } catch (error) {
      console.error('登录异常:', error);
      toast.error("登录失败，请稍后再试");
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
        <CardTitle className="text-xl">邮箱登录</CardTitle>
        <CardDescription>使用您的邮箱和密码登录</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="grid gap-4">
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
            <div className="flex items-center">
              <Label htmlFor="password">密码</Label>
              <button
                type="button"
                className="ml-auto text-sm underline-offset-4 hover:underline"
                onClick={onForgotPassword}
              >
                忘记密码？
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="请输入您的密码"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
        
        <div className="mt-4 text-center text-sm">
          还没有账户？{" "}
          <button
            onClick={onRegister}
            className="underline underline-offset-4 hover:text-primary"
          >
            立即注册
          </button>
        </div>
        
        <Button variant="ghost" onClick={onBack} className="w-full mt-2">
          返回其他登录方式
        </Button>
      </CardContent>
    </Card>
  );
}
