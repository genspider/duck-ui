import * as toast from "@/lib/stores/toast.svelte";
import { tr } from "@/lib/i18n/translate";
import {
  errorMessageOf,
  runImportQuery,
  tableNameError,
  toUploadError,
  type ImporterContext,
} from "./context";
import { buildCreateAs } from "./importSql";

/** State and handlers for the "From Query" tab. */
export function createQueryImport(ctx: ImporterContext) {
  let queryInput = $state("");
  let queryTableName = $state("");
  let isQueryImporting = $state(false);

  const handleQueryImport = async () => {
    if (!queryInput.trim()) {
      toast.error(tr("fileImporter.enterSqlQuery"));
      return;
    }

    if (!queryTableName.trim()) {
      toast.error(tr("fileImporter.enterTableName"));
      return;
    }

    const nameError = tableNameError(queryTableName);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    isQueryImporting = true;
    ctx.setErrors([]);

    try {
      const userQuery = queryInput.trim();
      const importMode = ctx.getImportMode();
      const createType = importMode === "view" ? "VIEW" : "TABLE";
      const resultType = importMode === "view" ? "view" : "table";

      await runImportQuery(buildCreateAs(createType, queryTableName, userQuery));

      toast.success(
        tr("fileImporter.createdFromResult", { type: resultType, name: queryTableName })
      );
      queryInput = "";
      queryTableName = "";
      ctx.close();
    } catch (e) {
      const errorMessage = errorMessageOf(e);
      ctx.setErrors([toUploadError(errorMessage)]);
      toast.error(tr("fileImporter.queryFailed", { message: errorMessage }));
    } finally {
      isQueryImporting = false;
    }
  };

  return {
    get queryInput() {
      return queryInput;
    },
    set queryInput(value: string) {
      queryInput = value;
    },
    get queryTableName() {
      return queryTableName;
    },
    set queryTableName(value: string) {
      queryTableName = value;
    },
    get isQueryImporting() {
      return isQueryImporting;
    },
    handleQueryImport,
  };
}

export type QueryImport = ReturnType<typeof createQueryImport>;
