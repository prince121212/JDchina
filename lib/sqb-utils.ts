import * as crypto from 'crypto';

// 收钱吧配置
export const SQB_CONFIG = {
  // 使用测试环境API地址，更稳定
  API_BASE_URL: process.env.NODE_ENV === 'production'
    ? 'https://vsi-api.shouqianba.com'
    : 'https://vsi-api.shouqianba.com', // 暂时都使用生产环境，因为没有专门的测试环境
  VENDOR_SN: '91802620',
  VENDOR_KEY: '4293e278592a11ae470199e23e4c1d96',
  APP_ID: '2025061300009239',
  TEST_ACTIVATION_CODE: '42167943',
};

// MD5签名函数
export function generateMD5Sign(content: string, key: string): string {
  const signString = content + key;
  return crypto.createHash('md5').update(signString, 'utf8').digest('hex').toUpperCase();
}

// 生成设备ID
export function generateDeviceId(): string {
  return `WMZS_TEST_${Date.now()}`;
}

// 网络诊断函数
export async function diagnoseSQBConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('开始网络诊断...');

    // 简单的连接测试
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${SQB_CONFIG.API_BASE_URL}/upay/v2/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'test test',
      },
      body: JSON.stringify({ test: true }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`网络诊断 - 响应状态: ${response.status}`);

    return {
      success: true,
      message: `网络连接正常，响应状态: ${response.status}`,
      details: { status: response.status }
    };
  } catch (error) {
    console.error('网络诊断失败:', error);

    let message = '网络连接失败';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        message = '网络连接超时（5秒）';
      } else if (error.message.includes('fetch failed')) {
        message = '无法连接到收钱吧服务器';
      } else {
        message = error.message;
      }
    }

    return {
      success: false,
      message,
      details: error
    };
  }
}

// API响应接口定义
interface SQBApiResponse {
  success: boolean;
  data?: any;
  status?: number;
  error?: string;
  details?: any;
}

// 收钱吧激活接口
export async function activateTerminal(deviceId: string, activationCode: string): Promise<SQBApiResponse> {
  const requestBody = {
    app_id: SQB_CONFIG.APP_ID,
    device_id: deviceId,
    code: activationCode,
  };

  const bodyString = JSON.stringify(requestBody);
  const sign = generateMD5Sign(bodyString, SQB_CONFIG.VENDOR_KEY);
  const authorization = `${SQB_CONFIG.VENDOR_SN} ${sign}`;

  try {
    const response = await fetch(`${SQB_CONFIG.API_BASE_URL}/terminal/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: bodyString,
      signal: AbortSignal.timeout(30000),
    });

    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
      details: error,
    };
  }
}

// 收钱吧签到接口
export async function checkinTerminal(terminalSn: string, terminalKey: string, deviceId: string): Promise<SQBApiResponse> {
  const requestBody = {
    device_id: deviceId,
  };

  const bodyString = JSON.stringify(requestBody);
  const sign = generateMD5Sign(bodyString, terminalKey);
  const authorization = `${terminalSn} ${sign}`;

  try {
    const response = await fetch(`${SQB_CONFIG.API_BASE_URL}/terminal/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: bodyString,
      signal: AbortSignal.timeout(30000),
    });

    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
      details: error,
    };
  }
}

// 收钱吧预下单接口
export async function createPayment(
  terminalSn: string,
  terminalKey: string,
  params: {
    client_sn: string;
    total_amount: number;
    subject: string;
    payway: string; // 2:支付宝, 3:微信
    operator?: string;
    notify_url?: string;
    description?: string;
  }
): Promise<SQBApiResponse> {
  // 构建请求体，严格按照官方文档要求
  const requestBody = {
    terminal_sn: terminalSn,
    client_sn: params.client_sn,
    total_amount: params.total_amount.toString(), // 必须是字符串
    subject: params.subject,
    payway: params.payway, // 必须是字符串
    operator: params.operator || 'system',
    // 暂时移除 notify_url 和 description，只保留必需字段
  };

  const bodyString = JSON.stringify(requestBody);
  console.log('创建支付 - 请求体:', bodyString);
  console.log('创建支付 - 终端密钥:', terminalKey);

  const sign = generateMD5Sign(bodyString, terminalKey);
  console.log('创建支付 - 生成的签名:', sign);

  const authorization = `${terminalSn} ${sign}`;
  console.log('创建支付 - Authorization头:', authorization);

  // 重试机制
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`创建支付 - 尝试 ${attempt}/3`);
      console.log(`创建支付 - 请求URL: ${SQB_CONFIG.API_BASE_URL}/upay/v2/precreate`);
      console.log(`创建支付 - 开始时间: ${new Date().toISOString()}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

      const response = await fetch(`${SQB_CONFIG.API_BASE_URL}/upay/v2/precreate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorization,
        },
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`创建支付 - 响应状态: ${response.status}`);
      console.log(`创建支付 - 响应时间: ${new Date().toISOString()}`);

      const result = await response.json();
      return {
        success: response.ok,
        data: result,
        status: response.status,
      };
    } catch (error) {
      console.error(`创建支付 - 尝试 ${attempt}/3 失败:`, error);

      if (attempt < 3) {
        const delay = attempt * 2000; // 递增延迟：2秒、4秒
        console.log(`创建支付 - 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 最后一次尝试失败
      console.error(`创建支付 - 所有重试失败，错误时间: ${new Date().toISOString()}`);

      let errorMessage = '网络请求失败';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '请求超时（15秒），请稍后重试';
        } else if (error.message.includes('fetch failed') || error.message.includes('Connect Timeout')) {
          errorMessage = '网络连接超时，请检查网络连接或稍后重试';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        details: error,
      };
    }
  }

  // 理论上不会到达这里，但为了 TypeScript 类型检查
  return {
    success: false,
    error: '未知错误',
  };
}

// 收钱吧支付查询接口
export async function queryPayment(terminalSn: string, terminalKey: string, clientSn: string): Promise<SQBApiResponse> {
  const requestBody = {
    terminal_sn: terminalSn,
    client_sn: clientSn,
  };

  const bodyString = JSON.stringify(requestBody);
  const sign = generateMD5Sign(bodyString, terminalKey);
  const authorization = `${terminalSn} ${sign}`;

  // 查询请求使用较少的重试次数
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(`${SQB_CONFIG.API_BASE_URL}/upay/v2/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorization,
        },
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      return {
        success: response.ok,
        data: result,
        status: response.status,
      };
    } catch (error) {
      console.error(`查询支付 - 尝试 ${attempt}/2 失败:`, error);

      if (attempt < 2) {
        console.log(`查询支付 - 等待 1秒 后重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      let errorMessage = '网络请求失败';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '查询请求超时（10秒）';
        } else if (error.message.includes('fetch failed') || error.message.includes('Connect Timeout')) {
          errorMessage = '网络连接超时，请检查网络连接';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        details: error,
      };
    }
  }

  return {
    success: false,
    error: '未知错误',
  };
}
