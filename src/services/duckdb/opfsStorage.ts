/**
 * OPFS storage inspection & cleanup.
 *
 * DuckDB-WASM persists each OPFS connection to a real OPFS database file
 * (`opfs://<name>.db`) in the browser's origin-private file system. Deleting
 * a table does NOT shrink or remove that file — it stays on disk. This module
 * lists those database files (with their WAL companions) so the user can see
 * how much space each OPFS database occupies and remove one they no longer
 * need. Removing the `.db` file (and its `.wal`/`.checkpoint`/`.recovery`
 * companions) permanently deletes that database's data.
 */

/** One persisted OPFS database file plus its WAL companions. */
export interface OpfsDbFile {
  /** The database path as DuckDB would use it, e.g. `data` for `opfs://data.db`. */
  name: string;
  /** On-disk size in bytes of the `.db` file. */
  sizeBytes: number;
}

const WAL_SUFFIXES = [".wal", ".wal.checkpoint", ".wal.recovery"];

async function fileSize(handle: FileSystemFileHandle): Promise<number> {
  try {
    const file = await handle.getFile();
    return file.size;
  } catch {
    return 0;
  }
}

/** Lists every persisted OPFS database file. */
export const listOpfsDatabases = async (): Promise<OpfsDbFile[]> => {
  if (!self.crossOriginIsolated || !navigator.storage?.getDirectory) return [];

  const root = await navigator.storage.getDirectory();
  const names: string[] = [];
  for await (const [name, handle] of root.entries()) {
    if (handle.kind === "file" && name.endsWith(".db")) names.push(name);
  }

  const databases: OpfsDbFile[] = [];
  for (const name of names.sort((a, b) => a.localeCompare(b))) {
    const handle = await root.getFileHandle(name);
    databases.push({ name: name.replace(/\.db$/, ""), sizeBytes: await fileSize(handle) });
  }
  return databases;
};

/** Deletes a persisted OPFS database file and its WAL companions. */
export const deleteOpfsDatabase = async (name: string): Promise<void> => {
  console.log("[opfsStorage] deleteOpfsDatabase start", { name });
  if (!self.crossOriginIsolated || !navigator.storage?.getDirectory) {
    console.error("[opfsStorage] OPFS unavailable", {
      crossOriginIsolated: self.crossOriginIsolated,
      hasGetDirectory: !!navigator.storage?.getDirectory,
    });
    return;
  }

  const root = await navigator.storage.getDirectory();
  const filesToRemove = [`${name}.db`, ...WAL_SUFFIXES.map((s) => `${name}${s}`)];
  console.log("[opfsStorage] files to remove", filesToRemove);
  for (const file of filesToRemove) {
    const isMain = file === `${name}.db`;
    try {
      await root.removeEntry(file);
      if (isMain) console.log("[opfsStorage] removed database file", file);
    } catch (error) {
      // WAL companions may legitimately not exist (already checkpointed/
      // cleaned) — that is not an error. Only a failure to remove the
      // database file itself must surface, or the success toast would lie.
      if (isMain) {
        console.error("[opfsStorage] failed to remove database file", file, error);
        throw error;
      }
    }
  }
  console.log("[opfsStorage] deleteOpfsDatabase done");
};
