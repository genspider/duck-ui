// 在 plain TypeScript（非 .svelte）中使用的同步翻译
import { get } from "svelte/store";
import { t } from "svelte-i18n";

export function tr(key: string, vars?: Record<string, string | number>): string {
  // svelte-i18n 的 t store 在未初始化时可能不可用，这里做安全回退
  let result: string;
  try {
    result = get(t)(key, vars);
  } catch {
    result = key;
  }
  // 如果没匹配到（返回 key 本身），也返回 key
  return result === key ? key : result;
}
