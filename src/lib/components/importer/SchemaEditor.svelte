<script lang="ts">
  import { t } from 'svelte-i18n'
  import { ChevronDown, ChevronUp } from 'lucide-svelte'
  import Button from '../common/Button.svelte'
  import Input from '../common/Input.svelte'
  import Select from '../common/Select.svelte'
  import { DUCKDB_TYPES } from '@/lib/fileImporter/constants'
  import type { UrlImport } from '@/lib/fileImporter/urlImport.svelte'

  interface Props {
    url: UrlImport
  }

  let { url }: Props = $props()

  const includedCount = $derived(url.schemaColumns.filter((col) => col.included).length)

  // The sniffer reports types outside the short list (HUGEINT, VARCHAR[], ...).
  // Without its own option the select would show a blank value.
  function typeOptions(current: string) {
    const known = DUCKDB_TYPES.map((type) => ({ value: type as string, label: type as string }))
    return known.some((option) => option.value === current) ? known : [{ value: current, label: current }, ...known]
  }
</script>

<div class="rounded-md border border-edge bg-surface p-3">
  <div class="flex items-center justify-between gap-3">
    <div>
      <h4 class="text-[13px] font-semibold text-fg">{$t('importer.schemaTitle')}</h4>
      <p class="text-xs text-fg-3">{$t('importer.schemaDesc')}</p>
    </div>
    <Button
      variant="ghost"
      size="sm"
      aria-expanded={url.isSchemaCustomizing}
      onclick={() => (url.isSchemaCustomizing = !url.isSchemaCustomizing)}
    >
      {#if url.isSchemaCustomizing}
        <ChevronUp size={14} />
        {$t('importer.hide')}
      {:else}
        <ChevronDown size={14} />
        {$t('importer.customize')}
      {/if}
    </Button>
  </div>

  {#if url.isSchemaCustomizing}
    <div class="mt-3 overflow-hidden rounded-md border border-edge-subtle">
      <div class="ds-table-wrap">
        <table class="ds-table">
          <thead>
            <tr class="ds-table-head-row">
              <th class="ds-table-th-compact w-14">{$t('importer.include')}</th>
              <th class="ds-table-th-compact">{$t('importer.originalName')}</th>
              <th class="ds-table-th-compact">{$t('importer.newName')}</th>
              <th class="ds-table-th-compact w-44">{$t('importer.type')}</th>
            </tr>
          </thead>
          <tbody>
            {#each url.schemaColumns as col (col.originalName)}
              <tr class="ds-table-row-static {col.included ? '' : 'opacity-50'}">
                <td class="ds-td-compact">
                  <input
                    type="checkbox"
                    class="ds-checkbox ds-checkbox-sm"
                    checked={col.included}
                    aria-label={$t('importer.includeColumn', { values: { name: col.originalName } })}
                    onchange={() => url.handleToggleColumn(col.originalName)}
                  />
                </td>
                <td class="ds-td-compact">
                  <code class="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">{col.originalName}</code>
                </td>
                <td class="ds-td-compact">
                  <Input
                    size="sm"
                    mono
                    value={col.newName}
                    placeholder={$t('importer.columnNamePlaceholder')}
                    disabled={!col.included}
                    oninput={(e) => url.handleRenameColumn(col.originalName, e.currentTarget.value)}
                  />
                </td>
                <td class="ds-td-compact">
                  <Select
                    size="sm"
                    value={col.type}
                    options={typeOptions(col.type)}
                    disabled={!col.included}
                    onchange={(value) => url.handleChangeColumnType(col.originalName, value)}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="bg-surface-2 px-3 py-2 text-xs text-fg-3">
        {$t('importer.columnsImported', { values: { count: includedCount, total: url.schemaColumns.length } })}
      </p>
    </div>
  {/if}
</div>
