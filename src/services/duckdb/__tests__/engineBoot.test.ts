import { describe, it, expect } from "vitest";
import { ENABLE_HTTP_METADATA_CACHE_SQL, buildMemoryLimitSql } from "../engineBoot";

describe("engineBoot statements", () => {
  it("writes the metadata cache switch as a literal", () => {
    expect(ENABLE_HTTP_METADATA_CACHE_SQL).toBe("SET enable_http_metadata_cache=true");
  });

  it("formats the memory limit as a whole-number MB cap", () => {
    expect(buildMemoryLimitSql(4096)).toBe("SET memory_limit='4096MB'");
    expect(buildMemoryLimitSql(511.9)).toBe("SET memory_limit='511MB'");
  });
});
