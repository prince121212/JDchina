"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/types/user";
import { toast } from "sonner";

interface ProfileFormProps {
  user: User;
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations();
  const [nickname, setNickname] = useState(user.nickname || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("profile.invalid_file_type"));
      return;
    }

    // 验证文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("profile.file_too_large"));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data) {
        const newAvatarUrl = result.data.url;

        // 验证返回的URL是否有效
        if (!newAvatarUrl || (!newAvatarUrl.startsWith('http://') && !newAvatarUrl.startsWith('https://'))) {
          toast.error("头像上传失败：无效的文件URL");
          return;
        }

        setAvatarUrl(newAvatarUrl);

        // 立即更新用户头像到数据库
        try {
          const updateResponse = await fetch('/api/update-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              avatar_url: newAvatarUrl,
            }),
          });

          const updateResult = await updateResponse.json();

          if (updateResponse.ok) {
            toast.success(t("profile.upload_success"));
          } else {
            toast.error(updateResult.message || t("profile.upload_failed"));
          }
        } catch (updateError) {
          console.error('Avatar URL update error:', updateError);
          toast.error(t("profile.save_failed"));
        }
      } else {
        // 提供更详细的错误信息
        const errorMessage = result.message || t("profile.upload_failed");
        toast.error(errorMessage);

        // 如果是配置错误，提供更友好的提示
        if (result.message && result.message.includes('存储服务配置')) {
          toast.error("存储服务暂时不可用，请稍后再试或联系管理员");
        }
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(t("profile.upload_failed"));
    } finally {
      setIsUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!nickname.trim()) {
      toast.error(t("profile.nickname_required"));
      return;
    }

    if (nickname.trim().length > 50) {
      toast.error(t("profile.nickname_too_long"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          avatar_url: avatarUrl,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(t("profile.save_success"));
        // 刷新页面以更新用户信息
        window.location.reload();
      } else {
        toast.error(result.message || t("profile.save_failed"));
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(t("profile.save_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 头像部分 */}
      <div className="space-y-2">
        <Label>{t("profile.avatar")}</Label>
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} alt={nickname} />
            <AvatarFallback className="text-lg">
              {nickname ? nickname.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? t("profile.saving") : t("profile.upload_avatar")}
            </Button>
          </div>
        </div>
      </div>

      {/* 用户名部分 */}
      <div className="space-y-2">
        <Label htmlFor="nickname">{t("profile.nickname")}</Label>
        <Input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t("profile.nickname_placeholder")}
          maxLength={50}
          required
        />
      </div>

      {/* 提交按钮 */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? t("profile.saving") : t("profile.save")}
      </Button>
    </form>
  );
}
