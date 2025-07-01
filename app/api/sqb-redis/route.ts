import { NextRequest } from 'next/server';
import { respData, respErr } from '@/lib/resp';
import {
  activateTerminal,
  checkinTerminal,
  createPayment,
  queryPayment,
  generateDeviceId,
  diagnoseSQBConnection,
  SQB_CONFIG
} from '@/lib/sqb-utils';
import { 
  storeTerminalInfo, 
  getTerminalInfo, 
  getAllTerminalInfo,
  markCheckinToday, 
  hasCheckedInToday,
  cachePaymentOrder,
  getCachedPaymentOrder,
  deleteTerminalInfo,
  getRedisStatus,
  TerminalInfo
} from '@/lib/redis-cache';
import { log } from '@/lib/logger';
import { getSnowId } from '@/lib/hash';

export async function POST(req: NextRequest) {
  try {
    const { action, deviceId, clientSn, amount, subject, payway } = await req.json();

    // 网络诊断不需要 Redis 连接
    if (action === 'diagnose') {
      log.info('开始网络诊断');

      const result = await diagnoseSQBConnection();

      return respData({
        message: '网络诊断完成',
        result: result,
      });
    }

    // 检查 Redis 连接状态
    const redisStatus = await getRedisStatus();
    if (!redisStatus.connected) {
      return respErr(`Redis 连接失败: ${redisStatus.error}`);
    }

    switch (action) {
      case 'activate': {
        // 激活新终端
        const newDeviceId = deviceId || generateDeviceId();
        
        log.info('开始激活终端', { device_id: newDeviceId });
        
        const result = await activateTerminal(newDeviceId, SQB_CONFIG.TEST_ACTIVATION_CODE);

        // 添加调试日志
        log.info('激活终端响应', {
          success: result.success,
          data: result.data,
          status: result.status
        });

        if (result.success) {
          // 检查响应结构
          if (!result.data || result.data.result_code !== '200' || !result.data.biz_response) {
            log.error('激活响应结构异常', new Error(`激活失败: success=${result.success}, status=${result.status}, data=${JSON.stringify(result.data)}`), {
              success: result.success,
              status: result.status,
              data: result.data
            });
            return respErr(`激活失败: ${result.data?.result_code || '未知错误'} - ${JSON.stringify(result.data)}`);
          }

          const { terminal_sn, terminal_key } = result.data.biz_response;
          
          // 存储到 Redis
          const terminalInfo: TerminalInfo = {
            terminal_sn,
            terminal_key,
            device_id: newDeviceId,
          };
          
          await storeTerminalInfo(terminalInfo);

          return respData({
            message: '终端激活成功',
            deviceId: newDeviceId,
            terminalData: result.data,
            cached: true,
          });
        } else {
          return respErr(`激活失败: ${result.error || '未知错误'}`);
        }
      }

      case 'checkin': {
        // 签到
        if (!deviceId) {
          return respErr('缺少设备ID参数');
        }

        // 检查今日是否已签到
        const alreadyCheckedIn = await hasCheckedInToday(deviceId);
        if (alreadyCheckedIn) {
          return respData({
            message: '今日已签到',
            alreadyCheckedIn: true,
          });
        }

        // 从 Redis 获取终端信息
        const terminalInfo = await getTerminalInfo(deviceId);
        if (!terminalInfo) {
          return respErr('终端信息不存在，请先激活终端');
        }

        log.info('开始签到', { 
          device_id: deviceId,
          terminal_sn: terminalInfo.terminal_sn 
        });

        const result = await checkinTerminal(
          terminalInfo.terminal_sn,
          terminalInfo.terminal_key,
          deviceId
        );

        if (result.success) {
          // 标记今日已签到
          await markCheckinToday(deviceId);

          return respData({
            message: '签到成功',
            checkinData: result.data,
          });
        } else {
          return respErr(`签到失败: ${result.error || '未知错误'}`);
        }
      }

      case 'create_payment': {
        // 创建支付订单
        if (!deviceId) {
          return respErr('缺少设备ID参数');
        }

        // 从 Redis 获取终端信息
        const terminalInfo = await getTerminalInfo(deviceId);
        if (!terminalInfo) {
          return respErr('终端信息不存在，请先激活终端');
        }

        // 检查今日是否需要签到
        const needCheckin = !(await hasCheckedInToday(deviceId));
        if (needCheckin) {
          log.info('需要先签到', { device_id: deviceId });
          
          const checkinResult = await checkinTerminal(
            terminalInfo.terminal_sn,
            terminalInfo.terminal_key,
            deviceId
          );

          if (checkinResult.success) {
            await markCheckinToday(deviceId);
            log.info('自动签到成功', { device_id: deviceId });
          } else {
            log.warn('自动签到失败', { 
              device_id: deviceId,
              error: checkinResult.error 
            });
          }
        }

        const orderClientSn = clientSn || `ORDER_${getSnowId()}`;
        
        log.info('开始创建支付订单', {
          device_id: deviceId,
          client_sn: orderClientSn,
          amount,
          payway
        });

        const result = await createPayment(
          terminalInfo.terminal_sn,
          terminalInfo.terminal_key, // 使用激活时的原始密钥
          {
            client_sn: orderClientSn,
            total_amount: amount || 100,
            subject: subject || '商品支付',
            payway: payway || '3',
            operator: 'system',
          }
        );

        if (result.success) {
          // 缓存支付订单信息
          await cachePaymentOrder(orderClientSn, {
            client_sn: orderClientSn,
            device_id: deviceId,
            terminal_sn: terminalInfo.terminal_sn,
            amount: amount || 100,
            subject: subject || '商品支付',
            payway: payway || '3',
            qr_code: result.data.biz_response?.data?.qr_code,
          });

          return respData({
            message: '支付订单创建成功',
            clientSn: orderClientSn,
            paymentData: result.data,
            needCheckin: needCheckin,
          });
        } else {
          return respErr(`创建支付订单失败: ${result.error || '未知错误'}`);
        }
      }

      case 'query_payment': {
        // 查询支付状态
        if (!clientSn) {
          return respErr('缺少订单号参数');
        }

        // 从缓存获取订单信息
        const cachedOrder = await getCachedPaymentOrder(clientSn);
        if (!cachedOrder) {
          return respErr('订单信息不存在');
        }

        // 从 Redis 获取终端信息
        const terminalInfo = await getTerminalInfo(cachedOrder.device_id);
        if (!terminalInfo) {
          return respErr('终端信息不存在');
        }

        log.info('查询支付状态', {
          client_sn: clientSn,
          device_id: cachedOrder.device_id
        });

        const result = await queryPayment(
          terminalInfo.terminal_sn,
          terminalInfo.terminal_key,
          clientSn
        );

        if (result.success) {
          return respData({
            message: '查询成功',
            queryData: result.data,
            cachedOrder,
          });
        } else {
          return respErr(`查询失败: ${result.error || '未知错误'}`);
        }
      }

      case 'get_terminals': {
        // 获取所有终端信息
        const terminals = await getAllTerminalInfo();
        return respData({
          message: '获取终端列表成功',
          terminals,
          count: terminals.length,
        });
      }

      case 'delete_terminal': {
        // 删除终端信息
        if (!deviceId) {
          return respErr('缺少设备ID参数');
        }

        await deleteTerminalInfo(deviceId);
        return respData({
          message: '终端信息已删除',
          deviceId,
        });
      }

      case 'redis_status': {
        // 获取 Redis 状态
        return respData({
          message: 'Redis 状态正常',
          status: redisStatus,
        });
      }

      default:
        return respErr('不支持的操作类型');
    }

  } catch (error) {
    log.error('SQB Redis API 错误', error as Error);
    return respErr(`服务器错误: ${(error as Error).message}`);
  }
}
