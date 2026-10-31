/**
 * Boot-time statements for the shared in-browser engine, kept as data so the
 * store applies them without assembling SQL inline.
 *
 * None of these statements take bind parameters in DuckDB (SET, INSTALL and
 * LOAD have no placeholders), so dynamic values are formatted here after the
 * caller validates them.
 */

/** Caches HTTP metadata between page loads instead of refetching it. */
export const ENABLE_HTTP_METADATA_CACHE_SQL = "SET enable_http_metadata_cache=true";

/** The engine's memory cap. Callers clamp the value to a sane range. */
export const buildMemoryLimitSql = (memoryLimitMb: number): string =>
  `SET memory_limit='${Math.floor(memoryLimitMb)}MB'`;
