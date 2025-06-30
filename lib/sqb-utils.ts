import crypto from 'crypto';

// 收钱吧配置
export const SQB_CONFIG = {
  API_BASE_URL: 'https://vsi-api.shouqianba.com',
  VENDOR_SN: '91802620',
  VENDOR_KEY: '4293e278592a11ae470199e23e4c1d96',
  APP_ID: '2025061300009239',
  TEST_ACTIVATION_CODE: '04212555',
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

// 收钱吧激活接口
export async function activateTerminal(deviceId: string, activationCode: string) {
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
export async function checkinTerminal(terminalSn: string, terminalKey: string, deviceId: string) {
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
) {
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

  try {
    const response = await fetch(`${SQB_CONFIG.API_BASE_URL}/upay/v2/precreate`, {
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

// 收钱吧支付查询接口
export async function queryPayment(terminalSn: string, terminalKey: string, clientSn: string) {
  const requestBody = {
    terminal_sn: terminalSn,
    client_sn: clientSn,
  };

  const bodyString = JSON.stringify(requestBody);
  const sign = generateMD5Sign(bodyString, terminalKey);
  const authorization = `${terminalSn} ${sign}`;

  try {
    const response = await fetch(`${SQB_CONFIG.API_BASE_URL}/upay/v2/query`, {
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
