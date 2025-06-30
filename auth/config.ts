import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { NextAuthConfig } from "next-auth";
import { Provider } from "next-auth/providers/index";
import { User } from "@/types/user";
import { getClientIp } from "@/lib/ip";
import { getIsoTimestr } from "@/lib/time";
import { getUuid } from "@/lib/hash";
import { saveUser } from "@/services/user";
import { findEmailUser } from "@/models/user";
import { log } from "@/lib/logger";
import bcrypt from "bcryptjs";

let providers: Provider[] = [];

// Email/Password Auth
providers.push(
  CredentialsProvider({
    id: "email",
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      log.info("邮箱登录验证开始", { email });

      if (!credentials?.email || !credentials?.password) {
        log.security("邮箱登录失败: 缺少邮箱或密码", { email });
        return null;
      }

      try {
        // 查找用户
        const user = await findEmailUser(email);

        if (!user) {
          log.security("邮箱登录失败: 用户不存在", { email });
          return null;
        }

        // 验证密码
        if (!user.password_hash) {
          log.security("邮箱登录失败: 用户未设置密码", { email, userId: user.uuid });
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isPasswordValid) {
          log.security("邮箱登录失败: 密码错误", { email, userId: user.uuid });
          return null;
        }

        // 检查邮箱是否已验证
        if (!user.email_verified) {
          log.security("邮箱登录失败: 邮箱未验证", { email, userId: user.uuid });
          return null;
        }

        log.audit("邮箱登录成功", { email, userId: user.uuid });
        return {
          id: user.uuid || '',
          email: user.email,
          name: user.nickname,
          image: user.avatar_url,
        };
      } catch (error) {
        log.error("邮箱登录异常", error as Error, { email });
        return null;
      }
    },
  })
);

// Google One Tap Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true" &&
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID
) {
  providers.push(
    CredentialsProvider({
      id: "google-one-tap",
      name: "google-one-tap",

      credentials: {
        credential: { type: "text" },
      },

      async authorize(credentials) {
        const googleClientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;
        if (!googleClientId) {
          log.error("Google One Tap 认证配置无效", undefined, { provider: 'google-one-tap' });
          return null;
        }

        const token = credentials!.credential;

        const response = await fetch(
          "https://oauth2.googleapis.com/tokeninfo?id_token=" + token
        );
        if (!response.ok) {
          log.error("Google One Tap token 验证失败", undefined, { provider: 'google-one-tap' });
          return null;
        }

        const payload = await response.json();
        if (!payload) {
          log.error("Google One Tap token payload 无效", undefined, { provider: 'google-one-tap' });
          return null;
        }

        const {
          email,
          sub,
          given_name,
          family_name,
          email_verified,
          picture: image,
        } = payload;
        if (!email) {
          log.error("Google One Tap payload 中缺少邮箱信息", undefined, { provider: 'google-one-tap' });
          return null;
        }

        const user = {
          id: sub,
          name: [given_name, family_name].join(" "),
          email,
          image,
          emailVerified: email_verified ? new Date() : null,
        };

        return user;
      },
    })
  );
}

// Google Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" &&
  process.env.AUTH_GOOGLE_ID &&
  process.env.AUTH_GOOGLE_SECRET
) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

// Github Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true" &&
  process.env.AUTH_GITHUB_ID &&
  process.env.AUTH_GITHUB_SECRET
) {
  providers.push(
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter((provider) => provider.id !== "google-one-tap");

export const authOptions: NextAuthConfig = {
  providers,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        // 基本验证：必须有邮箱
        if (!user.email) {
          log.security("登录失败: 缺少邮箱信息", { provider: account?.provider });
          return false;
        }

        // 检查管理员黑名单（如果配置了）
        const blockedEmails = (process.env.BLOCKED_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean);
        if (blockedEmails.includes(user.email)) {
          log.security("登录失败: 邮箱在黑名单中", { email: user.email, provider: account?.provider });
          return false;
        }

        // 对于邮箱登录，确保邮箱已验证
        if (account?.provider === 'email') {
          const emailUser = await findEmailUser(user.email);
          if (!emailUser) {
            log.security("邮箱登录失败: 用户不存在", { email: user.email });
            return false;
          }
          if (!emailUser.email_verified) {
            log.security("邮箱登录失败: 邮箱未验证", { email: user.email, userId: emailUser.uuid });
            return false;
          }
        }

        // 对于OAuth登录，检查邮箱验证状态
        if (account?.provider === 'google' || account?.provider === 'github') {
          // OAuth提供商通常已验证邮箱，但我们仍然检查
          if (!user.email) {
            log.security("OAuth登录失败: 缺少邮箱信息", { provider: account?.provider });
            return false;
          }
        }

        log.audit("用户登录成功", { email: user.email, provider: account?.provider });
        return true;
      } catch (error) {
        log.error("登录验证异常", error as Error, { email: user.email, provider: account?.provider });
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token }) {
      if (token && token.user && token.user) {
        session.user = token.user;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      try {
        if (user && user.email) {
          // 对于邮箱登录（Credentials Provider），user.id 就是 uuid
          if (account?.provider === 'email') {
            // 邮箱登录用户，直接从数据库获取用户信息
            const emailUser = await findEmailUser(user.email);
            if (emailUser) {
              token.user = {
                uuid: emailUser.uuid,
                email: emailUser.email,
                nickname: emailUser.nickname,
                avatar_url: emailUser.avatar_url,
                created_at: emailUser.created_at,
              };
            }
          } else if (account) {
            // OAuth登录用户，保存到数据库
            const dbUser: User = {
              uuid: getUuid(),
              email: user.email,
              nickname: user.name || "",
              avatar_url: user.image || "",
              signin_type: account.type,
              signin_provider: account.provider,
              signin_openid: account.providerAccountId,
              created_at: getIsoTimestr(),
              signin_ip: await getClientIp(),
            };

            try {
              const savedUser = await saveUser(dbUser);

              token.user = {
                uuid: savedUser.uuid,
                email: savedUser.email,
                nickname: savedUser.nickname,
                avatar_url: savedUser.avatar_url,
                created_at: savedUser.created_at,
              };
            } catch (e) {
              log.error("保存OAuth用户失败", e as Error, { email: user.email, provider: account?.provider });
            }
          }
        }
        return token;
      } catch (e) {
        log.error("JWT回调异常", e as Error, { email: user?.email, provider: account?.provider });
        return token;
      }
    },
  },
};
