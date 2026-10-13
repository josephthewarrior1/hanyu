"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User, Bi } from "@/lib/types";
import { api } from "@/lib/client";
type AppContext = {
  user: User | null;
  refresh: () => Promise<void>;
  t: (en: string, id: string) => string;
  b: (value: Bi | undefined) => string;
  error: string;
};
const Context = createContext<AppContext>({
  user: null,
  refresh: async () => {},
  t: (e) => e,
  b: (v) => v?.en ?? "",
  error: "",
});
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setUser(await api<User>("me"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [refresh]);
  useEffect(() => {
    const theme = user?.profile.theme ?? "light";
    document.documentElement.dataset.theme =
      theme === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.lang = user?.profile.locale ?? "id";
  }, [user]);
  return (
    <Context.Provider
      value={{
        user,
        refresh,
        t: (en, id) => (user?.profile.locale === "en" ? en : id),
        b: (v) => v?.[user?.profile.locale ?? "id"] ?? "",
        error,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
export function useData<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, error, reload };
}
