// 统一的API响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
  timestamp?: string;
}

// 错误类型枚举
export enum ErrorCode {
  SUCCESS = 0,
  GENERAL_ERROR = -1,
  INVALID_PARAMS = 1001,
  UNAUTHORIZED = 1002,
  FORBIDDEN = 1003,
  NOT_FOUND = 1004,
  RATE_LIMITED = 1005,
  DATABASE_ERROR = 2001,
  EMAIL_ERROR = 2002,
  PAYMENT_ERROR = 2003,
  INTERNAL_ERROR = 5000,
}

export function respData(data: any) {
  return respJson(ErrorCode.SUCCESS, "ok", data || []);
}

export function respOk() {
  return respJson(ErrorCode.SUCCESS, "ok");
}

export function respErr(message: string, code: number = ErrorCode.GENERAL_ERROR) {
  return respJson(code, message);
}

export function respJson(code: number, message: string, data?: any) {
  const json: ApiResponse = {
    code: code,
    message: message,
    timestamp: new Date().toISOString(),
  };

  if (data !== undefined) {
    json.data = data;
  }

  // 根据错误码设置HTTP状态码
  let status = 200;
  if (code === ErrorCode.INVALID_PARAMS) status = 400;
  else if (code === ErrorCode.UNAUTHORIZED) status = 401;
  else if (code === ErrorCode.FORBIDDEN) status = 403;
  else if (code === ErrorCode.NOT_FOUND) status = 404;
  else if (code === ErrorCode.RATE_LIMITED) status = 429;
  else if (code >= 2000) status = 500;
  else if (code < 0) status = 500;

  return Response.json(json, { status });
}

// 便捷的错误响应函数
export function respInvalidParams(message: string = "参数无效") {
  return respErr(message, ErrorCode.INVALID_PARAMS);
}

export function respUnauthorized(message: string = "未授权") {
  return respErr(message, ErrorCode.UNAUTHORIZED);
}

export function respForbidden(message: string = "禁止访问") {
  return respErr(message, ErrorCode.FORBIDDEN);
}

export function respNotFound(message: string = "资源不存在") {
  return respErr(message, ErrorCode.NOT_FOUND);
}

export function respRateLimited(message: string = "请求过于频繁") {
  return respErr(message, ErrorCode.RATE_LIMITED);
}
