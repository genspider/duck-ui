import {
  Bookmark,
  LayoutDashboard,
  Cable,
  History,
  Library,
  Puzzle,
  Radio,
  Settings,
  SquareTerminal,
  Database,
} from "lucide-svelte";
import { getUiConfig, type UiConfig } from "@/lib/appConfig";

export type PageRoute =
  "dashboards" | "saved-queries" | "history" | "connections" | "extensions" | "live" | "settings";
export type Route = "workspace" | PageRoute;
export type NavGroupId = "query" | "library" | "data" | "share" | "settings";

type Icon = typeof Settings;

export interface PageMeta {
  /** i18n key，渲染时用 $t()/tr() 翻译 */
  labelKey: string;
  descriptionKey: string;
  icon: Icon;
  /** Kiosk flag that removes the page when set. */
  hiddenBy?: keyof UiConfig;
}

export interface PageSection {
  id: string;
  /** i18n key，渲染时用 $t()/tr() 翻译 */
  labelKey: string;
}

export interface NavGroup {
  id: NavGroupId;
  /** i18n key，渲染时用 $t()/tr() 翻译 */
  labelKey: string;
  icon: Icon;
  routes: PageRoute[];
}

export const PAGE_ROUTES: Record<PageRoute, PageMeta> = {
  dashboards: {
    labelKey: "page.dashboards",
    descriptionKey: "page.dashboards.description",
    icon: LayoutDashboard,
  },
  "saved-queries": {
    labelKey: "page.savedQueries",
    descriptionKey: "page.savedQueries.description",
    icon: Bookmark,
  },
  history: {
    labelKey: "page.history",
    descriptionKey: "page.history.description",
    icon: History,
  },
  connections: {
    labelKey: "page.connections",
    descriptionKey: "page.connections.description",
    icon: Cable,
    hiddenBy: "hideConnections",
  },
  extensions: {
    labelKey: "page.extensions",
    descriptionKey: "page.extensions.description",
    icon: Puzzle,
    hiddenBy: "hideSettings",
  },
  live: {
    labelKey: "page.live",
    descriptionKey: "page.live.description",
    icon: Radio,
  },
  settings: {
    labelKey: "page.settings",
    descriptionKey: "page.settings.description",
    icon: Settings,
    hiddenBy: "hideSettings",
  },
};

export const PAGE_SECTIONS: Partial<Record<PageRoute, PageSection[]>> = {
  settings: [
    { id: "profile", labelKey: "section.profile" },
    { id: "general", labelKey: "section.general" },
    { id: "ai", labelKey: "section.ai" },
    { id: "performance", labelKey: "section.performance" },
    { id: "project", labelKey: "section.project" },
  ],
};

export const NAV_GROUPS: NavGroup[] = [
  { id: "query", labelKey: "nav.query", icon: SquareTerminal, routes: [] },
  {
    id: "library",
    labelKey: "nav.library",
    icon: Library,
    routes: ["dashboards", "saved-queries", "history"],
  },
  { id: "data", labelKey: "nav.data", icon: Database, routes: ["connections", "extensions"] },
  { id: "share", labelKey: "nav.share", icon: Radio, routes: ["live"] },
  { id: "settings", labelKey: "nav.settings", icon: Settings, routes: ["settings"] },
];

export const isPageRoute = (value: string | null): value is PageRoute =>
  value !== null && value in PAGE_ROUTES;

export function isRouteVisible(route: PageRoute): boolean {
  const flag = PAGE_ROUTES[route].hiddenBy;
  return !flag || !getUiConfig()[flag];
}

export function visibleRoutes(group: NavGroup): PageRoute[] {
  return group.routes.filter(isRouteVisible);
}

export function groupForRoute(route: Route): NavGroup {
  return NAV_GROUPS.find((g) => g.routes.includes(route as PageRoute)) ?? NAV_GROUPS[0];
}

export function sectionsFor(route: Route): PageSection[] {
  return route === "workspace" ? [] : (PAGE_SECTIONS[route] ?? []);
}
