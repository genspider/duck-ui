<script lang="ts">
  import { t } from 'svelte-i18n'
  import { Download, Play, Puzzle, RefreshCw } from 'lucide-svelte'
  import { isUnavailableExtensionError, type ExtensionAction, type ExtensionInfo } from '@/lib/duckdbExtensions'
  import Badge from '../common/Badge.svelte'
  import Button from '../common/Button.svelte'
  import Input from '../common/Input.svelte'
  import Spinner from '../common/Spinner.svelte'
  import { duck, duckActions } from '../../stores/duck.svelte'
  import * as toast from '../../stores/toast.svelte'

  /*
    Extension manager, as a Settings section. Lists `duckdb_extensions()` for
    the active connection and runs INSTALL / LOAD through the store.

    DuckDB has no column for "exists for this platform", so availability is
    learned rather than hardcoded: an extension whose INSTALL/LOAD comes back
    as a missing binary is marked unavailable for the rest of this visit.
  */

  const readOnly = $derived(duck((s) => !!s.currentSession?.capabilities.readonly))
  const isRemote = $derived(duck((s) => !!s.currentSession?.capabilities.remote))
  const connectionName = $derived(duck((s) => s.currentConnection?.name))

  let extensions = $state.raw<ExtensionInfo[] | null>(null)
  let loadError = $state<string | null>(null)
  let refreshing = $state(false)
  let pending = $state<Record<string, ExtensionAction>>({})
  let unavailable = $state<Record<string, boolean>>({})
  let filter = $state('')

  const visible = $derived.by(() => {
    const needle = filter.trim().toLowerCase()
    if (!extensions) return []
    if (!needle) return extensions
    return extensions.filter(
      (e) => e.name.toLowerCase().includes(needle) || e.description.toLowerCase().includes(needle),
    )
  })

  async function refresh() {
    refreshing = true
    try {
      extensions = await duckActions().fetchExtensions()
      loadError = null
    } catch (error) {
      loadError = error instanceof Error ? error.message : $t('ext.listFailed')
    } finally {
      refreshing = false
    }
  }

  // The parent remounts this component per connection, so loading once on
  // mount is enough.
  $effect(() => {
    let cancelled = false
    duckActions()
      .fetchExtensions()
      .then((list) => {
        if (!cancelled) extensions = list
      })
      .catch((error: unknown) => {
        if (!cancelled) loadError = error instanceof Error ? error.message : $t('ext.listFailed')
      })
    return () => {
      cancelled = true
    }
  })

  async function run(action: ExtensionAction, name: string) {
    pending[name] = action
    try {
      await duckActions().runExtensionAction(action, name)
      toast.success($t('ext.extensionRunned', { values: { action: action === 'install' ? $t('ext.installed') : $t('ext.loaded'), name } }))
      delete unavailable[name]
    } catch (error) {
      const message = error instanceof Error ? error.message : $t('common.unknownError')
      if (isUnavailableExtensionError(message)) unavailable[name] = true
      toast.error($t('ext.failedAction', { values: { action, name } }), { description: message })
    } finally {
      delete pending[name]
      await refresh()
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <h2 class="flex items-center gap-2 text-[13px] font-semibold text-fg">
        <Puzzle size={14} class="text-fg-3" />
        DuckDB {$t('ext.extensions')}
      </h2>
      <p class="mt-0.5 max-w-[64ch] text-xs leading-relaxed text-fg-3">
        {$t('ext.availableTo')}
        <span class="font-medium text-fg-2">{connectionName ?? $t('ext.activeConnection')}</span>.
        {isRemote
          ? $t('ext.installRemote')
          : $t('ext.installWasm')}
      </p>
    </div>
    <Button icon size="sm" variant="outline" disabled={refreshing} aria-label={$t('ext.refreshList')} onclick={refresh}>
      <RefreshCw size={14} class={refreshing ? 'animate-spin' : ''} />
    </Button>
  </div>

  {#if readOnly}
    <p class="rounded-md bg-surface-2 px-3 py-2 text-xs text-fg-2">
      {$t('ext.readOnly')}
    </p>
  {/if}

  {#if loadError}
    <p class="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{loadError}</p>
  {/if}

  {#if extensions === null && !loadError}
    <div class="flex items-center gap-2 text-[13px] text-fg-3">
      <Spinner size="sm" />
      {$t('ext.loading')}
    </div>
  {:else if extensions}
    <label class="sr-only" for="extension-filter">{$t('ext.filter')}</label>
    <Input id="extension-filter" type="search" size="sm" bind:value={filter} placeholder={$t('ext.filter') + '...'} />
    <ul class="divide-y divide-edge-subtle rounded-md border border-edge-subtle bg-surface">
      {#each visible as ext (ext.name)}
        {@const busy = pending[ext.name]}
        <li class="flex items-center gap-3 px-3 py-2">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-mono text-[13px] text-fg">{ext.name}</span>
              {#if ext.loaded}
                <Badge tone="brand">{$t('ext.loaded')}</Badge>
              {:else if ext.installed}
                <Badge>{$t('ext.installed')}</Badge>
              {/if}
              {#if unavailable[ext.name]}
                <Badge tone="warning" title={$t('ext.noBuild')}>
                  {isRemote ? $t('ext.unavailable') : $t('ext.notWasm')}
                </Badge>
              {/if}
            </div>
            {#if ext.description}
              <p class="truncate text-xs text-fg-3" title={ext.description}>{ext.description}</p>
            {/if}
          </div>
          <div class="flex shrink-0 gap-1.5">
            {#if !ext.installed}
              <Button
                size="sm"
                variant="outline"
                disabled={readOnly || !!busy}
                loading={busy === 'install'}
                onclick={() => run('install', ext.name)}
              >
                {#if busy !== 'install'}<Download size={13} />{/if}
                {$t('ext.install')}
              </Button>
            {/if}
            {#if !ext.loaded}
              <Button
                size="sm"
                variant="outline"
                disabled={readOnly || !!busy}
                loading={busy === 'load'}
                onclick={() => run('load', ext.name)}
              >
                {#if busy !== 'load'}<Play size={13} />{/if}
                {$t('ext.load')}
              </Button>
            {/if}
          </div>
        </li>
      {/each}
      {#if visible.length === 0}
        <li class="px-3 py-4 text-center text-xs text-fg-3">{$t('ext.noMatch', { values: { filter } })}</li>
      {/if}
    </ul>
  {/if}
</div>
