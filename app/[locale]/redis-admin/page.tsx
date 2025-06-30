'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Database, Shield, Clock } from 'lucide-react';

interface TerminalInfo {
  terminal_sn: string;
  terminal_key: string;
  device_id: string;
  last_checkin?: string;
  created_at?: string;
}

interface RedisStatus {
  connected: boolean;
  error?: string;
}

export default function RedisAdminPage() {
  const [terminals, setTerminals] = useState<TerminalInfo[]>([]);
  const [redisStatus, setRedisStatus] = useState<RedisStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 获取 Redis 状态
  const fetchRedisStatus = async () => {
    try {
      const response = await fetch('/api/sqb-redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redis_status' }),
      });
      const result = await response.json();
      if (result.code === 0) {
        setRedisStatus(result.data.status);
      }
    } catch (error) {
      console.error('获取 Redis 状态失败:', error);
      setRedisStatus({ connected: false, error: '连接失败' });
    }
  };

  // 获取终端列表
  const fetchTerminals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sqb-redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_terminals' }),
      });
      const result = await response.json();
      if (result.code === 0) {
        setTerminals(result.data.terminals);
        setMessage({ type: 'success', text: `获取到 ${result.data.count} 个终端信息` });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '获取终端列表失败' });
    } finally {
      setLoading(false);
    }
  };

  // 删除终端
  const deleteTerminal = async (deviceId: string) => {
    if (!confirm('确定要删除这个终端信息吗？')) return;

    try {
      const response = await fetch('/api/sqb-redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_terminal', deviceId }),
      });
      const result = await response.json();
      if (result.code === 0) {
        setMessage({ type: 'success', text: '终端信息已删除' });
        fetchTerminals(); // 刷新列表
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败' });
    }
  };

  // 格式化时间
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '未知';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  // 隐藏敏感信息
  const maskSensitiveInfo = (str: string) => {
    if (str.length <= 8) return str;
    return str.substring(0, 4) + '****' + str.substring(str.length - 4);
  };

  useEffect(() => {
    fetchRedisStatus();
    fetchTerminals();
  }, []);

  // 自动清除消息
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Redis 缓存管理</h1>
        <p className="text-gray-600">管理收钱吧终端信息的 Redis 缓存</p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' :
          message.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Redis 状态卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Redis 连接状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={redisStatus?.connected ? 'default' : 'destructive'}>
              {redisStatus?.connected ? '已连接' : '未连接'}
            </Badge>
            {redisStatus?.error && (
              <span className="text-red-600 text-sm">{redisStatus.error}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRedisStatus}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新状态
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 终端列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            缓存的终端信息
          </CardTitle>
          <CardDescription>
            存储在 Redis 中的收钱吧终端信息，敏感数据已加密显示
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">
              共 {terminals.length} 个终端
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTerminals}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新列表
            </Button>
          </div>

          {terminals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无缓存的终端信息
            </div>
          ) : (
            <div className="space-y-4">
              {terminals.map((terminal) => (
                <div
                  key={terminal.device_id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{terminal.device_id}</Badge>
                        <span className="text-sm text-gray-500">设备ID</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">终端序列号:</span>
                          <span className="ml-2 font-mono">{terminal.terminal_sn}</span>
                        </div>
                        <div>
                          <span className="font-medium">终端密钥:</span>
                          <span className="ml-2 font-mono text-gray-600">
                            {maskSensitiveInfo(terminal.terminal_key)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">创建时间:</span>
                          <span className="ml-2">{formatTime(terminal.created_at)}</span>
                        </div>
                        {terminal.last_checkin && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">最后签到:</span>
                            <span className="ml-2">{formatTime(terminal.last_checkin)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTerminal(terminal.device_id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 安全说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            安全说明
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• 终端密钥等敏感信息安全存储在 Redis 中，不再使用 localStorage</p>
          <p>• 缓存数据设置了合理的过期时间，自动清理过期信息</p>
          <p>• 支持手动删除不需要的终端信息</p>
          <p>• 所有敏感数据在前端显示时都经过脱敏处理</p>
        </CardContent>
      </Card>
    </div>
  );
}
