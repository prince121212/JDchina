"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Database, Trash2, RefreshCw, CheckCircle, XCircle, Gift, Mail, Coins } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DatabaseStats {
  resources: number;
  categories: number;
  tags: number;
}

interface ResetResults {
  resource_comments: number;
  resource_ratings: number;
  user_favorites: number;
  resource_tags: number;
  resources: number;
  categories: number;
  tags: number;
}

export default function SystemManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [lastResetResults, setLastResetResults] = useState<ResetResults | null>(null);

  // 数据库重置相关状态
  const [resetStep, setResetStep] = useState<'confirm' | 'verify' | 'complete'>('confirm');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  // 积分赠送相关状态
  const [isGrantingCredits, setIsGrantingCredits] = useState(false);
  const [grantForm, setGrantForm] = useState({
    targetEmail: '',
    credits: '',
    reason: ''
  });

  // 获取数据库统计
  const fetchDatabaseStats = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/admin/statistics');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.code === 0 && result.data) {
        // 适配统计API的数据结构
        const statsData = result.data;
        const newStats = {
          resources: statsData.resources?.total || 0,
          categories: statsData.categories?.total || 0,
          tags: statsData.tags?.total || 0
        };
        setStats(newStats);
        return newStats;
      } else {
        throw new Error(result.message || '获取统计数据失败');
      }
    } catch (error) {
      console.error('获取数据库统计失败:', error);
      toast.error('获取数据库统计失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // 发送验证码
  const sendVerificationCode = async () => {
    try {
      setIsSendingCode(true);
      toast.loading('正在发送验证码...', { id: 'send-code' });

      const response = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_verification'
        })
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || '发送验证码失败');
      }

      toast.success('验证码已发送到您的邮箱', { id: 'send-code' });
      setResetStep('verify');

    } catch (error) {
      console.error('发送验证码失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`发送验证码失败: ${errorMessage}`, { id: 'send-code' });
    } finally {
      setIsSendingCode(false);
    }
  };

  // 重置数据库
  const resetDatabase = async () => {
    try {
      setIsLoading(true);
      toast.loading('正在重置数据库...', { id: 'reset-db' });

      const response = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'confirm_reset',
          verification_code: verificationCode
        })
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || '重置失败');
      }

      setLastResetResults(result.data.results);
      toast.success('数据库重置成功！', { id: 'reset-db' });
      setResetStep('complete');

      // 重新获取统计数据
      await fetchDatabaseStats();

    } catch (error) {
      console.error('重置数据库失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`重置数据库失败: ${errorMessage}`, { id: 'reset-db' });
    } finally {
      setIsLoading(false);
    }
  };

  // 重置重置流程
  const resetResetFlow = () => {
    setResetStep('confirm');
    setVerificationCode('');
  };

  // 赠送积分
  const grantCredits = async () => {
    if (!grantForm.targetEmail.trim()) {
      toast.error('请输入用户邮箱');
      return;
    }

    const credits = parseInt(grantForm.credits);
    if (!credits || credits <= 0) {
      toast.error('请输入有效的积分数量');
      return;
    }

    if (credits > 10000) {
      toast.error('单次赠送积分不能超过10000');
      return;
    }

    try {
      setIsGrantingCredits(true);
      toast.loading('正在赠送积分...', { id: 'grant-credits' });

      const response = await fetch('/api/admin/grant-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_email: grantForm.targetEmail.trim(),
          credits: credits,
          reason: grantForm.reason.trim() || '管理员赠送'
        })
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || '赠送失败');
      }

      toast.success(`成功向 ${result.data.target_user.email} 赠送 ${result.data.credits_granted} 积分！`, { id: 'grant-credits' });

      // 清空表单
      setGrantForm({
        targetEmail: '',
        credits: '',
        reason: ''
      });

    } catch (error) {
      console.error('赠送积分失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`赠送积分失败: ${errorMessage}`, { id: 'grant-credits' });
    } finally {
      setIsGrantingCredits(false);
    }
  };

  // 初始加载统计数据
  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const totalItems = stats ? stats.resources + stats.categories + stats.tags : 0;

  return (
    <div className="space-y-6">
      {/* 数据库状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            数据库状态
          </CardTitle>
          <CardDescription>
            当前数据库中的数据统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats ? stats.resources : '...'}
              </div>
              <div className="text-sm text-muted-foreground">资源</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats ? stats.categories : '...'}
              </div>
              <div className="text-sm text-muted-foreground">分类</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats ? stats.tags : '...'}
              </div>
              <div className="text-sm text-muted-foreground">标签</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">总计:</span>
              <Badge variant={totalItems > 0 ? "secondary" : "outline"}>
                {totalItems} 项数据
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchDatabaseStats}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 积分赠送卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            赠送用户积分
          </CardTitle>
          <CardDescription>
            向指定用户赠送积分
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  用户邮箱
                </Label>
                <Input
                  id="targetEmail"
                  type="email"
                  placeholder="请输入用户邮箱"
                  value={grantForm.targetEmail}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, targetEmail: e.target.value }))}
                  disabled={isGrantingCredits}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits" className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  积分数量
                </Label>
                <Input
                  id="credits"
                  type="number"
                  placeholder="请输入积分数量"
                  min="1"
                  max="10000"
                  value={grantForm.credits}
                  onChange={(e) => setGrantForm(prev => ({ ...prev, credits: e.target.value }))}
                  disabled={isGrantingCredits}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">赠送原因（可选）</Label>
              <Textarea
                id="reason"
                placeholder="请输入赠送原因，如：活动奖励、补偿等"
                value={grantForm.reason}
                onChange={(e) => setGrantForm(prev => ({ ...prev, reason: e.target.value }))}
                disabled={isGrantingCredits}
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={grantCredits}
                disabled={isGrantingCredits || !grantForm.targetEmail.trim() || !grantForm.credits}
                className="bg-green-600 hover:bg-green-700"
              >
                <Gift className="h-4 w-4 mr-2" />
                {isGrantingCredits ? '赠送中...' : '赠送积分'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据库操作卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            数据库操作
          </CardTitle>
          <CardDescription>
            危险操作，请谨慎使用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-orange-900">重置数据库</h4>
                <p className="text-sm text-orange-700 mt-1">
                  清空所有资源、分类、标签、评论、评分和收藏数据，但保留用户账户数据。
                </p>
                <div className="mt-3">
                  {resetStep === 'confirm' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isLoading || totalItems === 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          重置数据库
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            确认重置数据库
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            <div className="space-y-2">
                              <div>此操作将删除以下数据：</div>
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>所有资源 ({stats?.resources || 0} 个)</li>
                                <li>所有分类 ({stats?.categories || 0} 个)</li>
                                <li>所有标签 ({stats?.tags || 0} 个)</li>
                                <li>所有评论和评分</li>
                                <li>所有收藏记录</li>
                              </ul>
                              <div className="text-green-600 font-medium">✅ 用户账户数据将被保留</div>
                              <div className="text-red-600 font-medium">⚠️ 为了安全起见，我们将向您的邮箱发送验证码进行确认</div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={sendVerificationCode}
                            disabled={isSendingCode}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {isSendingCode ? '发送中...' : '发送验证码'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {resetStep === 'verify' && (
                    <div className="space-y-3 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">验证码已发送</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        请查收您的邮箱，输入6位数字验证码以确认重置操作。
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="请输入6位验证码"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          maxLength={6}
                          className="flex-1"
                        />
                        <Button
                          onClick={resetDatabase}
                          disabled={isLoading || verificationCode.length !== 6}
                          variant="destructive"
                          size="sm"
                        >
                          {isLoading ? '重置中...' : '确认重置'}
                        </Button>
                      </div>
                      <Button
                        onClick={resetResetFlow}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        重新开始
                      </Button>
                    </div>
                  )}

                  {resetStep === 'complete' && (
                    <div className="space-y-3 p-4 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">重置完成</span>
                      </div>
                      <p className="text-sm text-green-700">
                        数据库已成功重置，所有资源数据已清空。
                      </p>
                      <Button
                        onClick={resetResetFlow}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        关闭
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最近操作结果 */}
      {lastResetResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              最近重置结果
            </CardTitle>
            <CardDescription>
              上次数据库重置操作的详细结果
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {lastResetResults.resources}
                </div>
                <div className="text-xs text-green-700">资源</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {lastResetResults.categories}
                </div>
                <div className="text-xs text-blue-700">分类</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {lastResetResults.tags}
                </div>
                <div className="text-xs text-purple-700">标签</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {lastResetResults.resource_comments + lastResetResults.resource_ratings + lastResetResults.user_favorites}
                </div>
                <div className="text-xs text-orange-700">关联数据</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Badge variant="outline" className="text-green-600">
                总计删除 {Object.values(lastResetResults).reduce((sum, count) => sum + count, 0)} 条记录
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
