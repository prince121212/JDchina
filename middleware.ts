import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    "/",
    "/(en|en-US|zh|zh-CN|zh-TW|zh-HK|zh-MO|ja|ko|ru|fr|de|ar|es|it)/:path*",
    // 精确排除 /api/ping，确保该接口始终显示为 Function Invocation
    "/((?!api/ping|privacy-policy|terms-of-service|api/|_next|_vercel|.*\\..*).*)",
  ],
};
