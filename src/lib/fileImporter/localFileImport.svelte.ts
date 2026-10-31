import { useDuckStore } from "@/store";
import { tr } from "@/lib/i18n/translate";
import * as toast from "@/lib/stores/toast.svelte";
import {
  DEFAULT_CSV_OPTIONS,
  MAX_CONCURRENT_UPLOADS,
  MAX_FILE_SIZE,
  SUPPORTED_FILE_EXTENSIONS,
} from "./constants";
import { errorMessageOf, tableNameError, toUploadError, type ImporterContext } from "./context";
import { formatFileSize } from "./helpers";
import type { CsvImportOptions, FileExtension, FileImportState, UploadError } from "./types";

const extensionOf = (name: string): string | undefined => name.split(".").pop()?.toLowerCase();

/** State and handlers for importing files picked or dropped from disk. */
export function createLocalFileImport(ctx: ImporterContext) {
  // Raw: File objects are replaced, never mutated, and must not be proxied.
  let files = $state.raw<File[]>([]);
  let tableNames = $state<Record<string, string>>({});
  let isUploading = $state(false);
  let importStates = $state<Record<string, FileImportState>>({});
  let csvOptions = $state<Record<string, CsvImportOptions>>({});
  let isDragActive = $state(false);
  let abortController: AbortController | null = null;

  const hasFilesToImport = $derived(files.length > 0);
  const allFilesSuccess = $derived(
    files.length > 0 && files.every((file) => importStates[file.name]?.status === "success")
  );

  const validateFile = (file: File): UploadError[] => {
    const errors: UploadError[] = [];
    const extension = extensionOf(file.name) as FileExtension;

    if (!extension || !SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
      errors.push(toUploadError(tr("fileImporter.unsupportedType", { ext: extension }), file.name));
      toast.error(tr("fileImporter.unsupportedType", { ext: extension }));
    }

    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMsg = tr("fileImporter.fileTooLarge", { size: formatFileSize(MAX_FILE_SIZE) });
      errors.push(toUploadError(fileSizeMsg, file.name));
      toast.warning(fileSizeMsg);
    }

    return errors;
  };

  const updateImportState = (fileName: string, state: Partial<FileImportState>) => {
    importStates[fileName] = { ...importStates[fileName], ...state };
  };

  const addFiles = (newFiles: File[]) => {
    ctx.setErrors([]);
    const newErrors: UploadError[] = [];
    const validFiles: File[] = [];

    newFiles.forEach((file) => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) newErrors.push(...fileErrors);
      else validFiles.push(file);
    });

    if (newErrors.length > 0) ctx.setErrors(newErrors);

    // Every piece of per-file state is keyed by name, so a file added twice
    // replaces the earlier pick instead of showing up as two rows.
    const incoming = new Map(validFiles.map((file) => [file.name, file]));
    files = [...files.filter((file) => !incoming.has(file.name)), ...incoming.values()];

    for (const file of incoming.values()) {
      tableNames[file.name] = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .toLowerCase();
      if (extensionOf(file.name) === "csv") {
        csvOptions[file.name] = { ...DEFAULT_CSV_OPTIONS };
      }
      importStates[file.name] = { fileName: file.name, status: "pending" };
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    isDragActive = false;
    const dropped = event.dataTransfer?.files;
    if (!dropped || dropped.length === 0) return;
    addFiles(Array.from(dropped));
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragActive = true;
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    // Entering a child fires dragleave on the container too. Only leaving the
    // container itself ends the drag.
    const container = event.currentTarget;
    const next = event.relatedTarget;
    if (container instanceof Node && next instanceof Node && container.contains(next)) return;
    isDragActive = false;
  };

  const handleFileInputChange = (event: Event & { currentTarget: HTMLInputElement }) => {
    const input = event.currentTarget;
    if (input.files && input.files.length > 0) {
      addFiles(Array.from(input.files));
    }
    // Lets the same file be picked again after it was removed.
    input.value = "";
  };

  const importOne = async (file: File) => {
    if (importStates[file.name]?.status === "success") return;

    const cleanTableName = tableNames[file.name];
    const nameError = tableNameError(cleanTableName);
    if (nameError) {
      ctx.setErrors([...ctx.getErrors(), toUploadError(nameError, file.name)]);
      updateImportState(file.name, { status: "error", error: nameError });
      toast.error(tr("fileImporter.invalidTableName", { name: file.name }));
      return;
    }

    updateImportState(file.name, { status: "processing" });

    try {
      const fileType = extensionOf(file.name) as FileExtension;
      const arrayBuffer = await file.arrayBuffer();

      const importOptions: Record<string, unknown> = {
        importMode: ctx.getImportMode(), // "table" or "view"
      };
      if (fileType === "csv" && csvOptions[file.name]) {
        importOptions.csv = $state.snapshot(csvOptions[file.name]);
      }

      await useDuckStore
        .getState()
        .importFile(file.name, arrayBuffer, cleanTableName, fileType, undefined, importOptions);
      updateImportState(file.name, { status: "success" });
      toast.success(tr("fileImporter.success", { name: file.name }));
    } catch (e) {
      const errorMessage = errorMessageOf(e);
      updateImportState(file.name, { status: "error", error: errorMessage });
      ctx.setErrors([
        ...ctx.getErrors(),
        toUploadError(
          errorMessage,
          errorMessage === "File processing aborted" ? undefined : file.name
        ),
      ]);
      toast.error(tr("fileImporter.importError", { name: file.name }));
    }
  };

  const reset = () => {
    files = [];
    tableNames = {};
    importStates = {};
    csvOptions = {};
  };

  const handleFileUpload = async () => {
    isUploading = true;
    ctx.setErrors([]);
    abortController = new AbortController();
    const { signal } = abortController;

    try {
      const queue = [...files];
      for (let i = 0; i < queue.length; i += MAX_CONCURRENT_UPLOADS) {
        if (signal.aborted) break;
        await Promise.all(queue.slice(i, i + MAX_CONCURRENT_UPLOADS).map(importOne));
      }

      if (allFilesSuccess) {
        ctx.close();
        reset();
        toast.success(tr("fileImporter.allImported"));
      }
    } catch (e) {
      console.error("Error uploading: ", e);
      toast.error(tr("fileImporter.uploadError"));
    } finally {
      isUploading = false;
      abortController = null;
    }
  };

  const handleCancelUpload = () => {
    abortController?.abort();
    isUploading = false;
    toast.warning(tr("fileImporter.uploadCancelled"));
  };

  const removeFile = (fileName: string) => {
    files = files.filter((file) => file.name !== fileName);
    delete tableNames[fileName];
    delete importStates[fileName];
    delete csvOptions[fileName];
    ctx.setErrors(ctx.getErrors().filter((error) => error.file !== fileName));
    toast.info(tr("fileImporter.removed", { name: fileName }));
  };

  const retryFileUpload = (fileName: string) => {
    updateImportState(fileName, { status: "pending", error: undefined });
    toast.info(tr("fileImporter.retrying", { name: fileName }));
  };

  return {
    get files() {
      return files;
    },
    get tableNames() {
      return tableNames;
    },
    get isUploading() {
      return isUploading;
    },
    get importStates() {
      return importStates;
    },
    get csvOptions() {
      return csvOptions;
    },
    get isDragActive() {
      return isDragActive;
    },
    get hasFilesToImport() {
      return hasFilesToImport;
    },
    setTableName(fileName: string, name: string) {
      tableNames[fileName] = name;
    },
    setCsvOptions(fileName: string, options: CsvImportOptions) {
      csvOptions[fileName] = options;
    },
    addFiles,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileInputChange,
    handleFileUpload,
    handleCancelUpload,
    removeFile,
    retryFileUpload,
  };
}

export type LocalFileImport = ReturnType<typeof createLocalFileImport>;
