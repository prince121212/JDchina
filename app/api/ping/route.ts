import {
  CreditsAmount,
  CreditsTransType,
  decreaseCredits,
} from "@/services/credit";
import { respData, respInvalidParams, respUnauthorized, respErr, ErrorCode } from "@/lib/resp";

import { getUserUuid } from "@/services/user";
import { log } from "@/lib/logger";

// 定义请求体类型
interface PingRequest {
  message: string;
}

// 定义响应体类型
interface PongResponse {
  pong: string;
}

// 共享的ping逻辑
function handlePingRequest(request: Request) {
  // 获取请求信息用于区分来源
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'Unknown';

  // 判断请求来源
  const isUptimeRobot = userAgent.toLowerCase().includes('uptimerobot');
  const isManualRequest = userAgent.toLowerCase().includes('httpie') ||
                         userAgent.toLowerCase().includes('curl') ||
                         userAgent.toLowerCase().includes('postman');

  let source = 'Unknown';
  if (isUptimeRobot) source = 'UptimeRobot';
  else if (isManualRequest) source = 'Manual';
  else source = 'Other';

  // 记录详细的请求信息
  console.log(`---保活成功Ping-Success | 来源: ${source} | IP: ${ip} | UA: ${userAgent}`);

  return {
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.6.0" // 从package.json获取
  };
}

// 轻量级保活端点 - 用于外部监控服务 (GET)
export async function GET(request: Request) {
  const responseData = handlePingRequest(request);
  return Response.json(responseData);
}

// 轻量级保活端点 - 用于外部监控服务 (HEAD)
export async function HEAD(request: Request) {
  const responseData = handlePingRequest(request);

  // HEAD请求只返回响应头，不返回响应体
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Status': responseData.status,
      'X-Timestamp': responseData.timestamp,
      'X-Version': responseData.version,
    },
  });
}

// 原有的POST端点 - 用于用户功能测试
export async function POST(req: Request) {
  try {
    const body: PingRequest = await req.json();

    // 验证参数
    if (!body.message || typeof body.message !== 'string') {
      return respInvalidParams("消息内容不能为空");
    }

    // 验证消息长度
    if (body.message.length > 1000) {
      return respInvalidParams("消息内容过长，最多1000字符");
    }

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respUnauthorized("用户未登录");
    }

    // decrease credits for ping
    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.Ping,
      credits: CreditsAmount.PingCost,
    });

    const response: PongResponse = {
      pong: `received message: ${body.message}`,
    };

    return respData(response);
  } catch (e) {
    log.error("Ping测试失败", e as Error, { endpoint: "/api/ping" });
    return respErr("测试失败，请稍后再试", ErrorCode.INTERNAL_ERROR);
  }
}
