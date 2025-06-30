import { ReactNode } from "react";
import { User } from "./user";

export interface ContextValue {
  theme: string;
  setTheme: (theme: string) => void;
  showSignModal: boolean;
  setShowSignModal: (show: boolean) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  userLoading: boolean;
  showFeedback: boolean;
  setShowFeedback: (show: boolean) => void;
  isAdmin: boolean;
  isHydrated: boolean;
  refreshUserInfo: () => Promise<void>;
  [propName: string]: any;
}
