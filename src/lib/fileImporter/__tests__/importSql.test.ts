import { describe, it, expect } from "vitest";
import {
  buildColumnSelection,
  buildCreateAs,
  buildCsvReadOptions,
  buildReadExpression,
  buildDropTable,
  buildAttachDatabase,
  buildImportTable,
  buildImportVerification,
} from "../importSql";
import { DEFAULT_CSV_OPTIONS } from "../constants";
import type { SchemaColumn } from "../types";

describe("buildCsvReadOptions", () => {
  it("writes the basic options as before when nothing advanced is set", () => {
    expect(buildCsvReadOptions(DEFAULT_CSV_OPTIONS)).toBe(
      "header=true, auto_detect=true, all_varchar=false, ignore_errors=true, null_padding=true, delim=','"
    );
    expect(buildCsvReadOptions()).toBe(buildCsvReadOptions(DEFAULT_CSV_OPTIONS));
  });

  it("passes every advanced option through", () => {
    const options = buildCsvReadOptions({
      ...DEFAULT_CSV_OPTIONS,
      delimiter: ";",
      quote: "`",
      escape: "\\",
      skip: 2,
      sampleSize: 5000,
      nullStr: "N/A",
      dateFormat: "%d/%m/%Y",
      timestampFormat: "%d/%m/%Y %H:%M",
    });
    expect(options).toBe(
      "header=true, auto_detect=true, all_varchar=false, ignore_errors=true, null_padding=true, " +
        "delim=';', quote='`', escape='\\', skip=2, sample_size=5000, nullstr='N/A', " +
        "dateformat='%d/%m/%Y', timestampformat='%d/%m/%Y %H:%M'"
    );
  });

  it("escapes quotes in text options", () => {
    const options = buildCsvReadOptions({
      delimiter: "'",
      quote: "'",
      nullStr: "') FROM x; DROP TABLE t; --",
    });
    expect(options).toContain("delim=''''");
    expect(options).toContain("quote=''''");
    expect(options).toContain("nullstr=''') FROM x; DROP TABLE t; --'");
  });

  it("leaves out options the form left empty", () => {
    const options = buildCsvReadOptions({
      quote: "",
      escape: "",
      nullStr: "",
      dateFormat: "",
      timestampFormat: "",
      skip: undefined,
      sampleSize: undefined,
    });
    expect(options).not.toMatch(/quote|escape|nullstr|dateformat|timestampformat|skip|sample_size/);
  });

  it("writes only whole numbers and booleans, whatever arrives", () => {
    const options = buildCsvReadOptions({
      header: "true) --" as unknown as boolean,
      skip: "1; DROP TABLE t" as unknown as number,
      sampleSize: 2.5,
    });
    expect(options).toContain("header=true,");
    expect(options).not.toContain("DROP");
    expect(options).not.toMatch(/skip|sample_size/);
  });
});

describe("buildReadExpression", () => {
  it("escapes the source", () => {
    expect(buildReadExpression("https://x.test/a'b.parquet", "parquet")).toBe(
      "read_parquet('https://x.test/a''b.parquet')"
    );
  });

  it("builds the preview and import forms of each format", () => {
    expect(buildReadExpression("u.csv", "csv")).toBe(
      "read_csv('u.csv', auto_detect=true, header=true)"
    );
    expect(buildReadExpression("u.csv", "csv", { ignoreErrors: true })).toBe(
      "read_csv('u.csv', auto_detect=true, ignore_errors=true, header=true)"
    );
    expect(buildReadExpression("u.json", "json", { ignoreErrors: true })).toBe(
      "read_json('u.json', auto_detect=true, ignore_errors=true)"
    );
  });

  it("returns null for a format it does not read", () => {
    expect(buildReadExpression("u.xlsx", "xlsx")).toBeNull();
    expect(buildReadExpression("u", undefined)).toBeNull();
  });
});

const column = (patch: Partial<SchemaColumn> & { originalName: string }): SchemaColumn => ({
  newName: patch.originalName,
  type: "VARCHAR",
  originalType: "VARCHAR",
  included: true,
  ...patch,
});

describe("buildColumnSelection", () => {
  it("selects everything when nothing was customized", () => {
    expect(buildColumnSelection([column({ originalName: "a" })])).toBe("*");
  });

  it("turns a changed type into a CAST", () => {
    const selection = buildColumnSelection([
      column({ originalName: "id", type: "BIGINT" }),
      column({ originalName: "name" }),
    ]);
    expect(selection).toBe('CAST("id" AS BIGINT) AS "id", "name"');
  });

  it("combines a cast with a rename and drops excluded columns", () => {
    const selection = buildColumnSelection([
      column({ originalName: "when", newName: "day", type: "DATE" }),
      column({ originalName: "junk", included: false }),
      column({ originalName: "n", newName: "count" }),
    ]);
    expect(selection).toBe('CAST("when" AS DATE) AS "day", "n" AS "count"');
  });

  it("escapes column names", () => {
    const selection = buildColumnSelection([
      column({ originalName: 'a"b', newName: 'c" FROM x; --' }),
    ]);
    expect(selection).toBe('"a""b" AS "c"" FROM x; --"');
  });

  it("does not cast a column whose type was left alone", () => {
    const selection = buildColumnSelection([
      column({ originalName: "a", type: "Utf8", originalType: "Utf8", newName: "b" }),
    ]);
    expect(selection).toBe('"a" AS "b"');
  });

  it("refuses a type that is not a type name", () => {
    expect(() =>
      buildColumnSelection([column({ originalName: "a", type: "INT) FROM x; --" })])
    ).toThrow("Unsupported column type");
  });

  it("accepts parameterized and list types", () => {
    expect(buildColumnSelection([column({ originalName: "a", type: "DECIMAL(18, 3)" })])).toBe(
      'CAST("a" AS DECIMAL(18, 3)) AS "a"'
    );
    expect(buildColumnSelection([column({ originalName: "a", type: "VARCHAR[]" })])).toBe(
      'CAST("a" AS VARCHAR[]) AS "a"'
    );
  });
});

describe("buildCreateAs", () => {
  it("quotes the table name", () => {
    expect(buildCreateAs("TABLE", " order ", "SELECT 1")).toBe(
      'CREATE OR REPLACE TABLE "order" AS SELECT 1'
    );
    expect(buildCreateAs("VIEW", 't"x', "SELECT 1")).toBe(
      'CREATE OR REPLACE VIEW "t""x" AS SELECT 1'
    );
  });
});

describe("buildDropTable", () => {
  it("quotes the table name", () => {
    expect(buildDropTable('a"b')).toBe('DROP TABLE IF EXISTS "a""b"');
  });
});

describe("buildAttachDatabase", () => {
  it("escapes the file name and quotes the alias", () => {
    expect(buildAttachDatabase("a'b.duckdb", 'a"b')).toBe(
      "ATTACH DATABASE 'a''b.duckdb' AS \"a\"\"b\""
    );
  });
});

describe("buildImportTable", () => {
  it("builds the csv import with its collected options", () => {
    expect(buildImportTable("TABLE", "data", "data.csv", "csv", "header=false")).toBe(
      "CREATE OR REPLACE TABLE \"data\" AS SELECT * FROM read_csv('data.csv', header=false)"
    );
  });

  it("falls back to the default csv options and lowercases the kind", () => {
    expect(buildImportTable("TABLE", "data", "data.csv", "CSV")).toBe(
      `CREATE OR REPLACE TABLE "data" AS SELECT * FROM read_csv('data.csv', ${buildCsvReadOptions()})`
    );
  });

  it("reads json with the sniffer on and the rest through their reader", () => {
    expect(buildImportTable("VIEW", "j", "j.json", "json")).toBe(
      "CREATE OR REPLACE VIEW \"j\" AS SELECT * FROM read_json('j.json', auto_detect=true, ignore_errors=true)"
    );
    expect(buildImportTable("TABLE", "p", "p.parquet", "parquet")).toBe(
      "CREATE OR REPLACE TABLE \"p\" AS SELECT * FROM read_parquet('p.parquet')"
    );
  });

  it("escapes the file name", () => {
    expect(buildImportTable("TABLE", "t", "a'b.parquet", "parquet")).toBe(
      "CREATE OR REPLACE TABLE \"t\" AS SELECT * FROM read_parquet('a''b.parquet')"
    );
  });
});

describe("buildImportVerification", () => {
  it("escapes the table and catalog", () => {
    const sql = buildImportVerification("t'", 'mem"');
    expect(sql).toContain("table_name = 't'''");
    expect(sql).toContain("table_catalog = 'mem\"'");
  });
});
