/** Human-readable engine time: "12 ms" under a second, "1.25 s" above. */
export function formatQueryTime(durationMs: number): string {
  return durationMs < 1000
    ? `${Math.max(0, Math.round(durationMs))} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

/** Message for a query that succeeded but returned no rows. */
export function zeroRowsMessage(
  t: (key: string, vars?: Record<string, unknown>) => string,
  durationMs?: number
): string {
  const took =
    durationMs === undefined ? "" : `（${t("common.took")} ${formatQueryTime(durationMs)}）`;
  return t("result.zeroRows", { values: { took } });
}
