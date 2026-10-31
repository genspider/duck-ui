<script lang="ts">
  import { t } from 'svelte-i18n'
  import { HardDrive, Trash2, RefreshCw, FolderX } from 'lucide-svelte'
  import { listOpfsDatabases, deleteOpfsDatabase, type OpfsDbFile } from '@/services/duckdb/opfsStorage'
  import { duck, duckActions } from '../../stores/duck.svelte'
  import Panel from '../common/Panel.svelte'
  import Button from '../common/Button.svelte'
  import ConfirmDialog from '../common/ConfirmDialog.svelte'
  import * as toast from '../../stores/toast.svelte'

  let dbs = $state<OpfsDbFile[]>([])
  let loading = $state(false)
  let unavailable = $state(false)
  let target = $state<OpfsDbFile | null>(null)

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  async function refresh() {
    loading = true
    try {
      const list = await listOpfsDatabases()
      dbs = list
      unavailable = !self.crossOriginIsolated || !navigator.storage?.getDirectory
    } finally {
      loading = false
    }
  }

  // Refresh whenever the set of OPFS connections changes (added, edited,
  // deleted) — each OPFS connection maps to a .db file in this storage, so
  // the panel mirrors connection management the way QuackAttachments does
  // with its responsive store list.
  const opfsConnections = $derived(
    duck((s) => s.connectionList.connections)
      .filter((c) => c.scope === 'OPFS')
      .map((c) => `${c.id}:${c.path ?? ''}`)
      .join('|')
  )
  $effect(() => {
    // Read the derived signature to register it as this effect's dependency.
    void opfsConnections
    void refresh()
  })

  async function confirmDelete() {
    const db = target
    target = null
    if (!db) return
    console.log('[opfs] confirmDelete', { name: db.name })
    // A database in use by the active connection must not be deleted — the
    // user is querying it right now. Refuse and ask them to switch away.
    const current = duck((s) => s.currentConnection)
    // `connection.path` includes the `.db` suffix (`test-ttt.db`) while
    // `db.name` does not (`test-ttt`) — normalise before comparing.
    const currentPath = current?.path?.replace(/\.db$/, '') ?? null
    console.log('[opfs] current connection', {
      id: current?.id,
      scope: current?.scope,
      path: current?.path,
      currentPathNormalized: currentPath,
      targetName: db.name,
    })
    if (current?.scope === 'OPFS' && currentPath === db.name) {
      toast.warning($t('opfs.inUse', { values: { name: db.name } }))
      return
    }
    try {
      // Removing a .db file should also remove the connection that points at
      // it, keeping connection management and storage in sync. Deleting the
      // connection closes its session (releasing the file handle) before we
      // unlink the file. The active-connection guard above already ensured
      // this isn't the currently-used connection.
      const matching = duck((s) => s.connectionList.connections).filter(
        (c) => c.scope === 'OPFS' && (c.path ?? '').replace(/\.db$/, '') === db.name
      )
      for (const conn of matching) {
        console.log('[opfs] deleting matching connection', conn.id, conn.path)
        duckActions().deleteConnection(conn.id)
      }
      if (matching.length > 0) {
        // deleteConnection closes its session asynchronously; give the file
        // handle a moment to release before unlinking on disk.
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
      await deleteOpfsDatabase(db.name)
      toast.success($t('opfs.deleted'))
      await refresh()
    } catch (error) {
      console.error('[opfs] delete failed', error)
      toast.error($t('opfs.deleteFailed'))
    }
  }

  $effect(() => {
    void refresh()
  })
</script>

<Panel title={$t('opfs.title')} description={$t('opfs.desc')} padding="none" class="mt-4">
  {#if unavailable}
    <p class="px-3 py-4 text-xs text-fg-3">{$t('opfs.unavailable')}</p>
  {:else}
    <div class="px-3 py-2">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs text-fg-3">
          {dbs.length === 0 ? $t('opfs.empty') : $t('opfs.count', { values: { count: dbs.length } })}
        </span>
        <Button icon size="xs" variant="ghost" onclick={refresh} disabled={loading} title={$t('opfs.refresh')} aria-label={$t('opfs.refresh')}>
          <RefreshCw size={13} class={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {#if dbs.length > 0}
        <ul class="divide-y divide-edge-subtle">
          {#each dbs as db (db.name)}
            <li class="flex items-center gap-2 py-1.5">
              <HardDrive size={14} class="shrink-0 text-accent" />
              <span class="min-w-0 flex-1 truncate font-mono text-xs text-fg">{db.name}.db</span>
              <span class="shrink-0 text-xs text-fg-3">{formatBytes(db.sizeBytes)}</span>
              <Button icon size="xs" variant="ghost" class="text-danger" onclick={() => (target = db)} title={$t('opfs.delete')} aria-label={$t('opfs.delete')}>
                <Trash2 size={13} />
              </Button>
            </li>
          {/each}
        </ul>
      {:else if !loading}
        <div class="flex flex-col items-center gap-1 py-4 text-fg-3">
          <FolderX size={20} />
          <p class="text-xs">{$t('opfs.empty')}</p>
        </div>
      {/if}
    </div>
  {/if}
</Panel>

<ConfirmDialog
  open={target !== null}
  title={$t('opfs.deleteTitle', { values: { name: target?.name ?? '' } })}
  description={$t('opfs.deleteDesc')}
  confirmLabel={$t('opfs.delete')}
  destructive
  onconfirm={confirmDelete}
  oncancel={() => (target = null)}
/>