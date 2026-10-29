import { describe, it, expect } from "vitest";
import { formatQueryTime, zeroRowsMessage } from "../resultMessages";

describe("formatQueryTime", () => {
  it("uses milliseconds under a second", () => {
    expect(formatQueryTime(12.4)).toBe("12 ms");
    expect(formatQueryTime(0)).toBe("0 ms");
  });

  it("uses seconds from one second up", () => {
    expect(formatQueryTime(1000)).toBe("1.00 s");
    expect(formatQueryTime(1254)).toBe("1.25 s");
  });
});

describe("zeroRowsMessage", () => {
  const mockT = (key: string, vars?: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const took = (vars?.values as any)?.took ?? "";
    if (key === "result.zeroRows") return `Query ran fine, 0 rows returned${took}.`;
    if (key === "common.took") return "took";
    return key;
  };

  it("includes the engine time when known", () => {
    expect(zeroRowsMessage(mockT, 12)).toBe("Query ran fine, 0 rows returned（took 12 ms）.");
  });

  it("omits the time for results restored from persistence", () => {
    expect(zeroRowsMessage(mockT)).toBe("Query ran fine, 0 rows returned.");
  });
});
