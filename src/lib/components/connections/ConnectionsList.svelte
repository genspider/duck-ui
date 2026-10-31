<script lang="ts">
  import { t } from 'svelte-i18n'
  import { Database, ExternalLink, Info, Pencil, Radio, Trash2 } from 'lucide-svelte'
  import type { ConnectionProvider } from '@/store/types'
  import Button from '../common/Button.svelte'
  import ConfirmDialog from '../common/ConfirmDialog.svelte'
  import Tooltip from '../common/Tooltip.svelte'

  interface Props {
    connections: ConnectionProvider[]
    currentConnectionId?: string
    loading: boolean
    onconnect: (connectionId: string) => void
    onedit: (connectionId: string) => void
    ondelete: (connectionId: string) => void
  }

  let { connections, currentConnectionId, loading, onconnect, onedit, ondelete }: Props = $props()

  let deleteTarget = $state<ConnectionProvider | null>(null)

  /** Why a connection cannot be edited or deleted, when it cannot. */
  function readOnlyReason(connection: ConnectionProvider): string | null {
    switch (connection.environment) {
      case 'ENV':
        return $t('connections.readOnlyEnv')
      case 'BUILT_IN':
        return $t('connections.readOnlyBuiltIn')
      case 'SESSION':
        return $t('connections.readOnlySession')
      default:
        return null
    }
  }

  function confirmDelete() {
    if (deleteTarget) ondelete(deleteTarget.id)
    deleteTarget = null
  }
</script>

<!--
  One row per connection. The row knows which environments are read-only and
  says why instead of hiding buttons. The wrapper scrolls sideways so a narrow
  container never clips the right-hand columns.
-->
<div class="ds-table-wrap">
  <table class="ds-table">
    <thead>
      <tr class="ds-table-head-row">
        <th class="ds-table-th">{$t('connections.name')}</th>
        <th class="ds-table-th">{$t('connections.scope')}</th>
        <th class="ds-table-th">{$t('connections.host')}</th>
        <th class="ds-table-th">{$t('connections.database')}</th>
        <th class="ds-table-th">{$t('connections.environment')}</th>
        <th class="ds-table-th-right">{$t('connections.actions')}</th>
      </tr>
    </thead>
    <tbody>
      {#each connections as connection (connection.id)}
        {@const isCurrent = connection.id === currentConnectionId}
        {@const reason = readOnlyReason(connection)}
        <tr class="ds-table-row">
          <td class="ds-td-strong border-l-2 {isCurrent ? 'border-l-success' : 'border-l-transparent'}">
            <div class="flex items-center gap-2 whitespace-nowrap">
              {#if connection.scope === 'WASM' || connection.scope === 'OPFS'}
                <Database size={14} class="shrink-0 text-fg-3" />
              {:else if connection.scope === 'Peer'}
                <Radio size={14} class="shrink-0 text-warning" />
              {:else}
                <ExternalLink size={14} class="shrink-0 text-fg-3" />
              {/if}
              {connection.name}
            </div>
          </td>
          <td class="ds-td">{connection.scope}</td>
          <td class="ds-td-mono">
            {connection.scope === 'OPFS'
              ? $t('connections.local')
              : connection.host || (connection.scope === 'WASM' ? $t('connections.local') : '-')}
          </td>
          <td class="ds-td">
            {connection.scope === 'OPFS'
              ? (connection.path ?? '').replace(/\.db$/, '') || '-'
              : connection.database || (connection.scope === 'WASM' ? 'memory' : '-')}
          </td>
          <td class="ds-td">{connection.environment}</td>
          <td class="ds-td">
            <div class="flex items-center justify-end gap-1.5">
              {#if connection.environment !== 'BUILT_IN'}
                <Button size="sm" variant="outline" disabled={isCurrent || loading} onclick={() => onconnect(connection.id)}>
                  {isCurrent ? $t('connections.connected') : $t('connections.connect')}
                </Button>
              {/if}

              {#if reason}
                <Tooltip text={reason} delay={150}>
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-3 hover:text-fg-2"
                    aria-label={reason}
                  >
                    <Info size={15} />
                  </button>
                </Tooltip>
              {:else}
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  disabled={connection.id === 'WASM'}
                  aria-label={$t('connections.editAria', { values: { name: connection.name } })}
                  onclick={() => onedit(connection.id)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  icon
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  aria-label={$t('connections.deleteAria', { values: { name: connection.name } })}
                  onclick={() => (deleteTarget = connection)}
                >
                  <Trash2 size={14} class="text-danger" />
                </Button>
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<ConfirmDialog
  open={deleteTarget !== null}
  title={$t('connections.deleteTitle')}
  description={deleteTarget
    ? $t('connections.deleteDesc', { values: { name: deleteTarget.name } })
    : ''}
  confirmLabel={$t('connections.delete')}
  destructive
  onconfirm={confirmDelete}
  oncancel={() => (deleteTarget = null)}
/>
