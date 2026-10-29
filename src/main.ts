import { mount } from "svelte";
import "./app.css";
import "./lib/i18n"; // 初始化 i18n（固定中文）
import App from "./App.svelte";

export const app = mount(App, {
  target: document.getElementById("app")!,
});
