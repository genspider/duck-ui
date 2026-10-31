import type { StateCreator } from "@/store/createStore";
import { toast } from "svelte-sonner";
import { tr } from "@/lib/i18n/translate";
import {
  catalogToDatabaseInfo,
  requireLocalDuckSession,
  runQuery,
  type DataSession,
} from "@/services/engine";
import { sqlEscapeIdentifier, sqlEscapeString, qualifyTable } from "@/lib/sqlSanitize";
import {
  buildAttachDatabase,
  buildCsvReadOptions,
  buildDropTable,
  buildImportTable,
  buildImportVerification,
} from "@/lib/fileImporter/importSql";
import { buildExtensionSql, LIST_EXTENSIONS_SQL, parseExtensionRows } from "@/lib/duckdbExtensions";
import type { DuckStoreState, SchemaSlice, ColumnStats, QueryResult } from "../types";

/** The active session, or a clear error when nothing is connected. */
const requireSession = (session: DataSession | null): DataSession => {
  if (!session) throw new Error(tr("error.noActiveConnection"));
  return session;
};

export const createSchemaSlice: StateCreator<DuckStoreState, [], [], SchemaSlice> = (set, get) => ({
  databases: [],
  isLoadingDbTablesFetch: true,
  schemaFetchError: null,

  fetchDatabasesAndTablesInfo: async () => {
    const session = get().currentSession;
    try {
      set({ isLoadingDbTablesFetch: true, schemaFetchError: null });

      if (!session?.capabilities.supportsCatalog) {
        set({ databases: [], schemaFetchError: null });
        return;
      }

      const snapshot = await session.introspect();
      set({ databases: catalogToDatabaseInfo(snapshot), schemaFetchError: null });
    } catch (error) {
      const errorMessage = tr("error.schemaLoadFailed", {
        message: error instanceof Error ? error.message : tr("common.unknownError"),
      });
      set({
        schemaFetchError: errorMessage,
      });
    } finally {
      set({ isLoadingDbTablesFetch: false });
    }
  },

  fetchTableColumnStats: async (databaseName, tableName, schema) => {
    const useBareName =
      databaseName === "main" || databaseName === "memory" || databaseName === ":memory:";
    // Wrapped in a SELECT rather than sent as a bare SUMMARIZE statement: some
    // external endpoints (e.g. a reverse proxy enforcing read-only queries)
    // allow-list by leading keyword, and SUMMARIZE isn't on it even though
    // it's read-only. DuckDB plans this wrapped form as a genuine SELECT
    // (aggregate + projection), not a special SUMMARIZE utility statement, so
    // this isn't fooling a naive check — it equally satisfies one that
    // inspects DuckDB's own statement type.
    const query = `SELECT * FROM (SUMMARIZE ${qualifyTable(useBareName ? undefined : databaseName, schema, tableName)})`;

    try {
      const result = await runQuery(requireSession(get().currentSession), query, "column-stats");
      if (result.error) throw new Error(result.error);

      // SUMMARIZE answers with a mix of text, BIGINT and DECIMAL. The counts
      // arrive as bigint, which the statistics view read as 0, so every
      // field becomes text here.
      const text = (value: unknown): string | null =>
        value === null || value === undefined ? null : String(value);
      const columnStats: ColumnStats[] = result.data.map((row) => ({
        column_name: String(row.column_name),
        column_type: String(row.column_type),
        min: text(row.min),
        max: text(row.max),
        approx_unique: text(row.approx_unique),
        avg: text(row.avg),
        std: text(row.std),
        q25: text(row.q25),
        q50: text(row.q50),
        q75: text(row.q75),
        count: text(row.count) ?? "0",
        null_percentage: text(row.null_percentage) ?? "0",
      }));

      return columnStats;
    } catch (error) {
      console.error("Failed to fetch column stats:", error);
      toast.error(tr("schema.loadStatsFailed"));
      return [];
    }
  },

  fetchColumnDistribution: async (databaseName, tableName, columnName, columnType, schema) => {
    const useBareName =
      databaseName === "main" || databaseName === "memory" || databaseName === ":memory:";
    const qualified = qualifyTable(useBareName ? undefined : databaseName, schema, tableName);
    const col = sqlEscapeIdentifier(columnName);

    const upperType = columnType.toUpperCase();
    // INTERVAL contains "INT" but can't do the histogram arithmetic — send it
    // down the top-k branch instead.
    const isNumeric =
      !upperType.includes("INTERVAL") &&
      ["INT", "DOUBLE", "FLOAT", "DECIMAL", "REAL", "NUMERIC"].some((t) => upperType.includes(t));

    // Numeric columns: 20-bin equi-width histogram. Everything else: top 5
    // values by count. Both are one aggregate query, run only on expand.
    const query = isNumeric
      ? `WITH src AS (SELECT ${col} AS v FROM ${qualified} WHERE ${col} IS NOT NULL),
              bounds AS (SELECT MIN(v) AS lo, MAX(v) AS hi FROM src)
         SELECT LEAST(19, GREATEST(0, CAST(FLOOR((v - lo) * 20.0 / NULLIF(hi - lo, 0)) AS INT))) AS bucket,
                COUNT(*) AS n
         FROM src, bounds GROUP BY 1 ORDER BY 1`
      : `SELECT CAST(${col} AS VARCHAR) AS v, COUNT(*) AS n
         FROM ${qualified} WHERE ${col} IS NOT NULL
         GROUP BY 1 ORDER BY n DESC, v LIMIT 5`;

    try {
      const result: QueryResult = await runQuery(
        requireSession(get().currentSession),
        query,
        "column-distribution"
      );
      if (result.error) throw new Error(result.error);

      if (isNumeric) {
        const bins = new Array<number>(20).fill(0);
        for (const row of result.data) {
          const count = Number(row.n ?? 0);
          // A constant column yields a NULL bucket — pile it into one bar.
          const bucket = row.bucket === null || row.bucket === undefined ? 0 : Number(row.bucket);
          if (bucket >= 0 && bucket < 20) bins[bucket] += count;
        }
        return { kind: "histogram", bins };
      }
      return {
        kind: "topk",
        values: result.data.map((row) => ({
          value: String(row.v),
          count: Number(row.n ?? 0),
        })),
      };
    } catch (error) {
      console.error("Failed to fetch column distribution:", error);
      return null;
    }
  },

  fetchTableDdl: async (databaseName, tableName, schema) => {
    const where = (nameColumn: string) =>
      `database_name = '${sqlEscapeString(databaseName)}'
         AND schema_name = '${sqlEscapeString(schema || "main")}'
         AND ${nameColumn} = '${sqlEscapeString(tableName)}'`;
    // The explorer lists views next to tables, so both catalogs are asked.
    const query = `SELECT sql FROM duckdb_tables() WHERE ${where("table_name")}
       UNION ALL
       SELECT sql FROM duckdb_views() WHERE ${where("view_name")}
       LIMIT 1`;

    try {
      const result = await runQuery(requireSession(get().currentSession), query, "table-ddl");
      if (result.error) throw new Error(result.error);
      const sql = result.data[0]?.sql;
      return typeof sql === "string" && sql.trim() ? sql : null;
    } catch (error) {
      console.error("Failed to fetch table DDL:", error);
      return null;
    }
  },

  deleteTable: async (tableName, database = "memory", schema) => {
    try {
      const session = requireSession(get().currentSession);
      if (!session.capabilities.writable) {
        throw new Error(tr("error.readOnly"));
      }
      set({ isLoading: true });
      const result = await runQuery(
        session,
        `DROP TABLE IF EXISTS ${qualifyTable(database, schema, tableName)}`,
        "delete-table"
      );
      if (result.error) throw new Error(result.error);
      await get().fetchDatabasesAndTablesInfo();
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: tr("error.deleteTableFailed", {
          message: error instanceof Error ? error.message : tr("common.unknownError"),
        }),
      });
      throw error;
    }
  },

  fetchExtensions: async () => {
    const result = await runQuery(
      requireSession(get().currentSession),
      LIST_EXTENSIONS_SQL,
      "list-extensions"
    );
    if (result.error) throw new Error(result.error);
    return parseExtensionRows(result.data);
  },

  runExtensionAction: async (action, name) => {
    const session = requireSession(get().currentSession);
    if (session.capabilities.readonly) {
      throw new Error(tr("error.readOnly"));
    }
    const result = await runQuery(session, buildExtensionSql(action, name), `${action}-extension`);
    if (result.error) throw new Error(result.error);
  },

  importFile: async (
    fileName,
    fileContent,
    tableName,
    fileType,
    _database = "memory",
    options = {}
  ) => {
    try {
      const session = requireSession(get().currentSession);
      if (!session.capabilities.supportsFileImport) {
        throw new Error(tr("error.cannotImportLocal"));
      }
      // Registering a file buffer has no SQL expression — it needs the engine
      // handle directly.
      const { db, connection } = requireLocalDuckSession(session).local;

      const buffer = new Uint8Array(fileContent);
      const importMode = options.importMode || "table";

      // DuckDB WASM has no `read_arrow`: Arrow IPC goes straight into the
      // engine through its own insert. The bytes are decoded first, which
      // accepts the file format as well as the stream format the insert
      // expects. A view would have nothing to point at, so both modes make
      // a table.
      if (fileType.toLowerCase() === "arrow") {
        const { tableFromIPC, tableToIPC } = await import("apache-arrow");
        const ipc = tableToIPC(tableFromIPC(buffer), "stream");
        await connection.query(buildDropTable(tableName));
        await connection.insertArrowFromIPCStream(ipc, { name: tableName, create: true });
        await get().fetchDatabasesAndTablesInfo();
        return;
      }

      try {
        await db.dropFile(fileName);
      } catch {
        /* file may not exist */
      }
      await db.registerFileBuffer(fileName, buffer);
      // Handle DuckDB database files (.duckdb, .db, .ddb)
      if (fileType === "duckdb" || fileType === "db" || fileType === "ddb") {
        await connection.query(buildAttachDatabase(fileName, tableName));
        await get().fetchDatabasesAndTablesInfo();
        return;
      }

      const createType = importMode === "view" ? "VIEW" : "TABLE";

      const kind = fileType.toLowerCase();
      const isXlsx = kind === "xlsx" || kind === "xls";

      // Excel can hold mixed-type columns (numbers + text like "CEB472" or
      // "电量-202601"). read_xlsx's type sniffer throws on those. Try normal
      // inference first; when a mixed column trips the sniffer, fall back to
      // reading every column as text so the import still lands.
      const runImport = (xlsxAllVarchar: boolean) =>
        connection.query(
          buildImportTable(
            createType,
            tableName,
            fileName,
            kind,
            kind === "csv" ? buildCsvReadOptions(options.csv || {}) : undefined,
            isXlsx ? { allVarchar: xlsxAllVarchar } : undefined
          )
        );

      try {
        await runImport(false);
      } catch (error) {
        if (!isXlsx) throw error;
        // Only the type sniffer's mixed-column failures warrant the fallback.
        // Anything else (corrupt file, permissions, ...) must surface as-is
        // rather than be swallowed by a pointless varchar retry.
        const message = error instanceof Error ? error.message : String(error);
        if (!/could not convert|cast|type|unable to parse/i.test(message)) throw error;
        await runImport(true);
      }
      // 运行时获取当前 catalog 名（memory 或 OPFS 数据库名）
      const catalogResult = await connection.query("SELECT current_catalog AS cat");
      const catalog = String(catalogResult.toArray()[0]?.cat ?? "memory");
      console.log(`catalog: ${catalog}`);
      const verification = await connection.query(buildImportVerification(tableName, catalog));
      if (Number(verification.toArray()[0]?.count ?? 0) === 0) {
        throw new Error(`${createType} creation verification failed`);
      }
      await get().fetchDatabasesAndTablesInfo();
    } catch (error) {
      await get().fetchDatabasesAndTablesInfo();
      throw new Error(
        tr("error.importFailed", {
          message: error instanceof Error ? error.message : tr("common.unknownError"),
        })
      );
    }
  },
});
