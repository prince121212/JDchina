import { NextRequest } from 'next/server';
import { activateTerminal, checkinTerminal, createPayment, queryPayment, generateDeviceId, SQB_CONFIG } from '@/lib/sqb-utils';
import { getSnowId } from '@/lib/hash';

export async function POST(req: NextRequest) {
  try {
    const { action, terminalSn, terminalKey, deviceId, clientSn, amount, subject, payway } = await req.json();

    // 激活测试
    if (action === 'activate') {
      const newDeviceId = generateDeviceId();
      const result = await activateTerminal(newDeviceId, SQB_CONFIG.TEST_ACTIVATION_CODE);

      if (result.success) {
        return Response.json({
          success: true,
          message: '激活成功',
          data: {
            deviceId: newDeviceId,
            terminalData: result.data,
          },
        });
      } else {
        return Response.json({
          success: false,
          message: `激活失败: ${result.error || '未知错误'}`,
          data: result,
        });
      }
    }

    // 签到测试
    if (action === 'checkin') {
      if (!terminalSn || !terminalKey || !deviceId) {
        return Response.json({
          success: false,
          message: '签到需要提供 terminalSn, terminalKey 和 deviceId 参数',
        });
      }

      const result = await checkinTerminal(terminalSn, terminalKey, deviceId);

      if (result.success) {
        return Response.json({
          success: true,
          message: '签到成功',
          data: {
            terminalSn,
            deviceId,
            checkinData: result.data,
          },
        });
      } else {
        return Response.json({
          success: false,
          message: `签到失败: ${result.error || '未知错误'}`,
          data: result,
        });
      }
    }

    // 预下单测试
    if (action === 'create_payment') {
      if (!terminalSn || !terminalKey) {
        return Response.json({
          success: false,
          message: '创建支付需要提供 terminalSn 和 terminalKey 参数',
        });
      }

      const orderClientSn = clientSn || `TEST_${getSnowId()}`;
      const paymentAmount = amount || 1;
      const paymentSubject = subject || '收钱吧预下单测试';
      const paymentWay = payway || '3';

      const result = await createPayment(terminalSn, terminalKey, {
        client_sn: orderClientSn,
        total_amount: paymentAmount,
        subject: paymentSubject,
        payway: paymentWay,
        operator: 'test_user',
      });

      if (result.success) {
        return Response.json({
          success: true,
          message: '预下单成功',
          data: {
            terminalSn,
            orderClientSn,
            paymentData: result.data,
          },
        });
      } else {
        return Response.json({
          success: false,
          message: `预下单失败: ${result.error || '未知错误'}`,
          data: result,
        });
      }
    }

    // 查询测试
    if (action === 'query_payment') {
      if (!terminalSn || !terminalKey || !clientSn) {
        return Response.json({
          success: false,
          message: '查询支付需要提供 terminalSn, terminalKey 和 clientSn 参数',
        });
      }

      const result = await queryPayment(terminalSn, terminalKey, clientSn);

      if (result.success) {
        return Response.json({
          success: true,
          message: '支付查询成功',
          data: {
            terminalSn,
            clientSn,
            queryData: result.data,
          },
        });
      } else {
        return Response.json({
          success: false,
          message: `支付查询失败: ${result.error || '未知错误'}`,
          data: result,
        });
      }
    }

    return Response.json({
      success: false,
      message: '不支持的操作',
    });
  } catch (error) {
    console.error('收钱吧演示接口异常', error);
    return Response.json({
      success: false,
      message: '服务器错误',
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
}
