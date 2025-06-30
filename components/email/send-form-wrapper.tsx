"use client";

import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailErrorBoundary } from './error-boundary';
import { EmailType } from '@/types/email';

interface EmailSendFormProps {
  onSuccess?: () => void;
  defaultType?: EmailType;
  defaultTo?: string;
}

// 动态导入 EmailSendForm，禁用 SSR
const EmailSendForm = dynamic(() => import('./send-form').then(mod => ({ default: mod.EmailSendForm })), {
  ssr: false,
  loading: () => (
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
  )
});

export function EmailSendFormWrapper(props: EmailSendFormProps) {
  return (
    <EmailErrorBoundary>
      <EmailSendForm {...props} />
    </EmailErrorBoundary>
  );
}
