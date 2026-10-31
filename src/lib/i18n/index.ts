import { init, addMessages, locale } from "svelte-i18n";
import zh from "./locales/zh.json";
import en from "./locales/en.json";

addMessages("zh", zh);
addMessages("en", en);

const LOCALE_KEY = "app.locale";
const SUPPORTED = ["zh", "en"] as const;
type SupportedLocale = (typeof SUPPORTED)[number];

function initialLocale(): SupportedLocale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY) as SupportedLocale | null;
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {
    // localStorage 不可用（隐私模式等）→ 跟随浏览器
  }
  const browser = navigator.language.toLowerCase();
  return browser.startsWith("zh") ? "zh" : "en";
}

init({
  fallbackLocale: "zh",
  initialLocale: initialLocale(),
});

// svelte-i18n v4 removes locale.get(). Keep a snapshot for sync reads.
let _locale: SupportedLocale = initialLocale();
locale.subscribe((v) => {
  if (v) _locale = v as SupportedLocale;
});

/** 切换语言并持久化 */
export function setLocale(next: SupportedLocale): void {
  locale.set(next);
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch {
    // 持久化失败不影响当前会话
  }
}

export function getLocale(): SupportedLocale {
  return _locale;
}

export { SUPPORTED, LOCALE_KEY };
export type { SupportedLocale };
