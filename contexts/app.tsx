"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { cacheGet, cacheRemove, cacheSet } from "@/lib/cache";

import { CacheKey } from "@/services/constant";
import { ContextValue } from "@/types/context";
import { User } from "@/types/user";
import moment from "moment";
// 动态导入useOneTapLogin以避免服务器端渲染问题
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { log } from "@/lib/logger";

// 动态导入，不在服务器端渲染
const OneTapLoginComponent = dynamic(() => import("@/hooks/useOneTapLogin"), {
  ssr: false,
});

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  // 条件渲染OneTapLogin组件，而不是直接调用hook
  const [showOneTapLogin, setShowOneTapLogin] = useState(false);
  
  useEffect(() => {
    // 确保这段代码只在客户端执行
    if (typeof window !== 'undefined') {
      if (
        process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true" &&
        process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID
      ) {
        setShowOneTapLogin(true);
      }
    }
  }, []);

  const { data: session } = useSession();

  const [theme, setTheme] = useState<string>(() => {
    return process.env.NEXT_PUBLIC_DEFAULT_THEME || "";
  });

  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    // 初始化时从缓存中读取管理员状态
    if (typeof window !== 'undefined') {
      const cachedAdminStatus = cacheGet(CacheKey.AdminStatus);
      return cachedAdminStatus === 'true';
    }
    return false;
  });

  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  // 用于防止重复请求的 ref
  const fetchingUserInfo = useRef<boolean>(false);
  const lastSessionId = useRef<string | null>(null);

  // 检查缓存的用户信息是否完整
  const isCachedUserInfoComplete = useCallback((userData: any): boolean => {
    if (!userData || typeof userData !== 'object') {
      return false;
    }

    // 检查必需的基础字段
    const requiredFields = ['uuid', 'email', 'nickname'];
    const hasRequiredFields = requiredFields.every(field =>
      userData[field] !== undefined && userData[field] !== null && userData[field] !== ''
    );

    // 检查是否有管理员状态字段（业务相关）
    const hasAdminStatus = userData.hasOwnProperty('isAdmin');

    // 检查是否有积分信息（业务相关）
    const hasCreditsInfo = userData.credits && typeof userData.credits === 'object';

    log.debug("缓存用户信息完整性检查", {
      hasRequiredFields,
      hasAdminStatus,
      hasCreditsInfo,
      userData: {
        uuid: userData.uuid,
        email: userData.email,
        hasCredits: !!userData.credits,
        isAdmin: userData.isAdmin
      }
    });

    // 只有当基础字段完整且有业务字段时才认为是完整的
    return hasRequiredFields && hasAdminStatus && hasCreditsInfo;
  }, []);



  const updateInvite = useCallback(async (user: User) => {
    try {
      if (user.invited_by) {
        // user already been invited
        return;
      }

      const inviteCode = cacheGet(CacheKey.InviteCode);
      if (!inviteCode) {
        // no invite code
        return;
      }

      const userCreatedAt = moment(user.created_at).unix();
      const currentTime = moment().unix();
      const timeDiff = Number(currentTime - userCreatedAt);

      if (timeDiff <= 0 || timeDiff > 7200) {
        // user created more than 2 hours
        return;
      }

      // update invite relation
      const req = {
        invite_code: inviteCode,
        user_uuid: user.uuid,
      };
      const resp = await fetch("/api/update-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      });
      if (!resp.ok) {
        throw new Error("update invite failed with status: " + resp.status);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
      cacheRemove(CacheKey.InviteCode);
    } catch (e) {
      log.error("更新邀请关系失败", e as Error, { function: "updateInvite" });
    }
  }, []);

  const fetchUserInfo = useCallback(async function () {
    // 防止重复请求
    if (fetchingUserInfo.current) {
      log.debug("请求进行中，跳过重复调用", { function: "fetchUserInfo" });
      return;
    }

    // 先检查缓存中的用户信息是否完整
    try {
      const cachedUser = cacheGet(CacheKey.UserInfo);
      if (cachedUser) {
        const userData = JSON.parse(cachedUser);
        if (isCachedUserInfoComplete(userData)) {
          // 缓存信息完整，直接使用缓存
          setUser(userData);
          setIsAdmin(userData.isAdmin || false);
          updateInvite(userData);

          log.debug("使用完整的缓存用户信息，跳过API请求", {
            user_uuid: userData.uuid,
            function: "fetchUserInfo",
            source: "cache"
          });
          return;
        } else {
          log.debug("缓存用户信息不完整，需要重新获取", {
            user_uuid: userData.uuid,
            function: "fetchUserInfo"
          });
        }
      }
    } catch (e) {
      log.warn("检查缓存用户信息时出错", { error: e as Error });
    }

    try {
      fetchingUserInfo.current = true;
      setUserLoading(true);
      log.debug("开始获取用户信息", { function: "fetchUserInfo" });

      const resp = await fetch("/api/get-user-info", {
        method: "POST",
      });

      if (!resp.ok) {
        throw new Error("fetch user info failed with status: " + resp.status);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
      log.debug("用户信息获取成功", {
        function: "fetchUserInfo",
        user_uuid: data.uuid
      });

      // 设置管理员状态（从用户信息中获取）
      const adminStatus = data.isAdmin || false;
      setIsAdmin(adminStatus);

      // 缓存管理员状态（会话级别缓存，无过期时间）
      cacheSet(CacheKey.AdminStatus, adminStatus.toString(), -1);

      // 缓存用户信息到 localStorage（会话级别缓存，无过期时间）
      cacheSet(CacheKey.UserInfo, JSON.stringify(data), -1);

      log.debug("从API获取用户信息并更新缓存", {
        isAdmin: adminStatus,
        function: "fetchUserInfo",
        user_uuid: data.uuid,
        source: "api"
      });

      updateInvite(data);
    } catch (e) {
      log.error("获取用户信息失败", e as Error, { function: "fetchUserInfo" });
    } finally {
      setUserLoading(false);
      fetchingUserInfo.current = false;
    }
  }, [updateInvite, isCachedUserInfoComplete]);

  // 清理不完整的缓存并强制重新获取用户信息
  const refreshUserInfo = useCallback(async () => {
    log.debug("手动刷新用户信息", { function: "refreshUserInfo" });

    // 清理现有缓存
    cacheRemove(CacheKey.UserInfo);
    cacheRemove(CacheKey.AdminStatus);

    // 重新获取用户信息
    await fetchUserInfo();
  }, [fetchUserInfo]);

  // 客户端水合后立即从缓存恢复用户信息
  useEffect(() => {
    if (typeof window !== 'undefined' && !isHydrated) {
      setIsHydrated(true);

      // 尝试从 localStorage 恢复用户信息
      try {
        const cachedUser = cacheGet(CacheKey.UserInfo);
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);

          if (isCachedUserInfoComplete(userData)) {
            // 缓存信息完整，直接使用
            setUser(userData);
            setIsAdmin(userData.isAdmin || false);
            log.debug("从完整缓存恢复用户信息", {
              user_uuid: userData.uuid,
              function: "hydrateEffect",
              isComplete: true
            });
          } else {
            // 缓存信息不完整，仅恢复基础信息，等待后续API更新
            setUser(userData);
            setIsAdmin(userData.isAdmin || false);
            log.debug("从不完整缓存恢复用户信息", {
              user_uuid: userData.uuid,
              function: "hydrateEffect",
              isComplete: false
            });
          }
        }
      } catch (e) {
        log.warn("读取缓存用户信息失败", { error: e as Error });
      }
    }
  }, [isHydrated, isCachedUserInfoComplete]);

  useEffect(() => {
    // 只有当 session 真正变化时才重新获取用户信息
    const currentSessionId = session?.user?.email || null;

    if (session && session.user && currentSessionId !== lastSessionId.current) {
      log.debug("Session 变化，获取用户信息", {
        currentSessionId,
        function: "useEffect"
      });
      lastSessionId.current = currentSessionId;
      fetchUserInfo();
    } else if (!session && lastSessionId.current) {
      // 用户登出时清理状态
      log.debug("用户登出，清理状态", { function: "useEffect" });
      lastSessionId.current = null;
      setUser(null);
      setIsAdmin(false);
      // 清理管理员状态缓存和用户信息缓存
      cacheRemove(CacheKey.AdminStatus);
      cacheRemove(CacheKey.UserInfo);
    }
  }, [session, fetchUserInfo]);

  // 使用 useMemo 优化 context value
  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    showSignModal,
    setShowSignModal,
    user,
    setUser,
    userLoading,
    showFeedback,
    setShowFeedback,
    isAdmin,
    isHydrated,
    refreshUserInfo,
  }), [
    theme,
    showSignModal,
    user,
    userLoading,
    showFeedback,
    isAdmin,
    isHydrated,
    refreshUserInfo,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {showOneTapLogin && <OneTapLoginComponent />}
      {children}
    </AppContext.Provider>
  );
};
