<script lang="ts">
  import { t } from 'svelte-i18n'
  import type { ImportPlan } from '@/lib/projectBundle/format'
  import { applyProjectImport, previewProjectImport } from '@/services/projectTransfer'
  import Badge from '../common/Badge.svelte'
  import Button from '../common/Button.svelte'
  import Modal from '../common/Modal.svelte'
  import { duck } from '../../stores/duck.svelte'
  import * as toast from '../../stores/toast.svelte'

  interface Props {
    /** The dialog is open whenever a file is set. */
    file: File | null
    /** Clears the file. */
    onclose: () => void
  }

  interface PreviewRow {
    kind: string
    name: string
    action: 'create' | 'overwrite'
  }

  let { file, onclose }: Props = $props()

  const currentProfileId = $derived(duck((s) => s.currentProfileId))

  let plan = $state.raw<ImportPlan | null>(null)
  let error = $state<string | null>(null)
  let importing = $state(false)

  const rows = $derived<PreviewRow[]>(
    plan
      ? [
          ...plan.queries.map((entry) => ({ kind: $t('projectImport.query'), name: entry.item.name, action: entry.action })),
          ...plan.notebooks.map((entry) => ({ kind: $t('projectImport.notebook'), name: entry.item.title, action: entry.action })),
          ...plan.dashboards.map((entry) => ({ kind: $t('projectImport.dashboard'), name: entry.item.name, action: entry.action })),
        ]
      : [],
  )
  const overwrites = $derived(rows.filter((row) => row.action === 'overwrite').length)

  $effect(() => {
    const target = file
    const profileId = currentProfileId
    if (!target || !profileId) return
    let cancelled = false
    previewProjectImport(profileId, target)
      .then((result) => {
        if (!cancelled) plan = result
      })
      .catch((reason: unknown) => {
        if (!cancelled) error = reason instanceof Error ? reason.message : $t('projectImport.readFailed')
      })
    return () => {
      cancelled = true
    }
  })

  function close() {
    plan = null
    error = null
    onclose()
  }

  async function runImport() {
    if (!plan || !currentProfileId) return
    importing = true
    try {
      await applyProjectImport(currentProfileId, plan)
      toast.success($t('projectImport.imported', { values: { count: rows.length } }))
      close()
    } catch (reason) {
      toast.error($t('projectImport.importFailed', { values: { message: reason instanceof Error ? reason.message : 'unknown error' } }))
    } finally {
      importing = false
    }
  }
</script>

<Modal open={file !== null} title={$t('projectImport.title')} description={file?.name ?? ''} size="md" onclose={close}>
  {#if error}
    <p class="text-[13px] text-danger" role="alert">{error}</p>
  {:else if !plan}
    <p class="text-[13px] text-fg-3">{$t('projectImport.reading')}</p>
  {:else if rows.length === 0}
    <p class="text-[13px] text-fg-3">{$t('projectImport.noneFound')}</p>
  {:else}
    <div class="flex flex-col gap-2">
      <p class="text-[13px] text-fg-3">
        {$t('projectImport.summary', { values: { new: rows.length - overwrites, overwritten: overwrites } })}
      </p>
      <ul class="max-h-72 divide-y divide-edge-subtle overflow-auto rounded-md border border-edge-subtle text-[13px]">
        {#each rows as row, index (index)}
          <li class="flex items-center gap-2 px-3 py-1.5">
            <span class="w-20 shrink-0 text-xs text-fg-3">{row.kind}</span>
            <span class="min-w-0 flex-1 truncate text-fg">{row.name}</span>
            <Badge tone={row.action === 'overwrite' ? 'danger' : 'neutral'}>
              {row.action === 'overwrite' ? $t('projectImport.overwrite') : $t('projectImport.create')}
            </Badge>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#snippet footer()}
    <Button size="sm" variant="outline" onclick={close}>{$t('common.cancel')}</Button>
    <Button size="sm" disabled={!plan || rows.length === 0} loading={importing} onclick={runImport}>{$t('common.import')}</Button>
  {/snippet}
</Modal>
