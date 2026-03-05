
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebase';
import { InitiativeScope, PointConfig, UserRole, UserProfile } from '../types';

// Định nghĩa Theme
export const THEMES = {
  red: { primary: 'bg-orange-600', hover: 'hover:bg-orange-700', text: 'text-orange-600', border: 'border-orange-200', gradient: 'from-orange-500 to-red-600', accent: 'bg-orange-50', shadow: 'shadow-orange-600/20' },
  blue: { primary: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-500 to-indigo-600', accent: 'bg-blue-50', shadow: 'shadow-blue-600/20' },
  emerald: { primary: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-600', accent: 'bg-emerald-50', shadow: 'shadow-emerald-600/20' },
  indigo: { primary: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-600', border: 'border-indigo-200', gradient: 'from-indigo-500 to-purple-600', accent: 'bg-indigo-50', shadow: 'shadow-indigo-600/20' }
};

export const DEFAULT_POINT_CONFIG: PointConfig = { HLH: 1, NPSC: 2, NPC: 3, EVN: 4 };

type ThemeKey = keyof typeof THEMES;
type TabType = 'list' | 'stats' | 'chat' | 'bubble' | 'treemap' | 'references' | 'research' | 'register' | 'approvals';

interface AppContextType {
  user: any;
  userProfile: UserProfile | null;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  activeTheme: typeof THEMES['red'];
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  currentScope: InitiativeScope;
  setCurrentScope: (scope: InitiativeScope) => void;
  pointConfig: PointConfig;
  setPointConfig: (config: PointConfig) => void;
  savePointConfig: (config: PointConfig) => Promise<boolean>;
  geminiApiKey: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [theme, setTheme] = useState<ThemeKey>('red');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [currentScope, setCurrentScope] = useState<InitiativeScope>('Company');
  const [pointConfig, setPointConfig] = useState<PointConfig>(DEFAULT_POINT_CONFIG);

  // Gemini API Key từ env var
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || null;

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser?.email);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Load profile từ Firestore
          const profileDoc = await db.collection('users').doc(firebaseUser.uid).get();
          if (profileDoc.exists) {
            setUserProfile(profileDoc.data() as UserProfile);
          } else {
            // Tạo profile mặc định
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              role: 'user'
            };
            setUserProfile(defaultProfile);
          }
        } catch (e) {
          console.error("Error loading user profile:", e);
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'user'
          });
        }
      } else {
        setUserProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  // Dark mode toggle
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Load Point Config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const doc = await db.collection('settings').doc('global_config').get();
        if (doc.exists && doc.data()?.pointConfig) {
          setPointConfig(doc.data()?.pointConfig as PointConfig);
        }
      } catch (e) {
        console.error("Error fetching point config:", e);
      }
    };
    fetchConfig();
  }, []);

  const savePointConfig = async (newConfig: PointConfig) => {
    try {
      await db.collection('settings').doc('global_config').set({ pointConfig: newConfig }, { merge: true });
      setPointConfig(newConfig);
      return true;
    } catch (e: any) {
      console.error("Error saving point config:", e);
      alert("Lỗi khi lưu cấu hình: " + e.message);
      return false;
    }
  };

  const value = {
    user,
    userProfile,
    activeTab, setActiveTab,
    theme, setTheme,
    activeTheme: THEMES[theme],
    isDarkMode, setIsDarkMode,
    currentScope, setCurrentScope,
    pointConfig, setPointConfig, savePointConfig,
    geminiApiKey
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
