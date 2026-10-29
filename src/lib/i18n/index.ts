import { init, addMessages } from "svelte-i18n";
import zh from "./locales/zh.json";

addMessages("zh", zh);

init({
  fallbackLocale: "zh",
  initialLocale: "zh", // 固定中文，不跟随浏览器
});
