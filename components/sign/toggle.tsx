"use client";

import SignIn from "./sign_in";
import User from "./user";
import { useAppContext } from "@/contexts/app";

export default function SignToggle() {
  const { user, isHydrated } = useAppContext();

  // 水合完成前显示加载状态
  if (!isHydrated) {
    return (
      <div className="flex items-center gap-x-2 px-2">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-x-2 px-2">
      {user ? <User user={user} /> : <SignIn />}
    </div>
  );
}
