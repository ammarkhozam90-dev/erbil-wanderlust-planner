import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar" | "ku";

export const LANGUAGES: { code: Lang; label: string; native: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", native: "EN", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "AR", dir: "rtl" },
  { code: "ku", label: "Kurdish", native: "KU", dir: "rtl" },
];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; dir: "ltr" | "rtl" };
const LanguageContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "erbilgo:lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Lang | null)) || "en";
    if (stored && stored !== lang) setLangState(stored);
  }, []);

  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  return <LanguageContext.Provider value={{ lang, setLang, dir }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
