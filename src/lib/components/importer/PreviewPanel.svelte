<script lang="ts">
  import { t } from 'svelte-i18n'
  import { ArrowLeft, Check } from 'lucide-svelte'
  import type { QueryResult } from '@/store'
  import Button from '../common/Button.svelte'
  import VirtualTable from '../table/VirtualTable.svelte'
  import ErrorAlertList from './ErrorAlertList.svelte'
  import SchemaEditor from './SchemaEditor.svelte'
  import { PREVIEW_ROW_LIMIT } from '@/lib/fileImporter/constants'
  import type { UrlImport } from '@/lib/fileImporter/urlImport.svelte'
  import type { UploadError } from '@/lib/fileImporter/types'

  interface Props {
    url: UrlImport
    previewData: QueryResult
    errors: UploadError[]
  }

  let { url, previewData, errors }: Props = $props()

  const meta = $derived(
    previewData.columns.map((name, idx) => ({ name, type: previewData.columnTypes[idx] ?? '' }))
  )
  const rows = $derived(previewData.data.map((row) => previewData.columns.map((name) => row[name])))
  const shortName = $derived(
    url.previewFileName.length > 50 ? `...${url.previewFileName.slice(-47)}` : url.previewFileName
  )
</script>

<!-- Preview of a URL source before importing it, with optional schema edits. -->
<div class="flex flex-col gap-4">
  <div class="flex items-start justify-between gap-3 rounded-md border border-edge bg-surface p-3">
    <div class="min-w-0">
      <h3 class="truncate text-[13px] font-semibold text-fg" title={url.previewFileName}>{$t('importer.previewTitle', { values: { name: shortName } })}</h3>
      <p class="mt-0.5 text-xs text-fg-3">
        {$t('importer.tableName')} <span class="font-mono text-fg-2">{url.previewTableName}</span>
      </p>
      <p class="mt-0.5 text-xs text-fg-4">
        {$t('importer.showingRows', { values: { limit: PREVIEW_ROW_LIMIT, count: previewData.rowCount } })}
      </p>
    </div>
    <Button variant="ghost" size="sm" onclick={url.handleBackFromPreview}>
      <ArrowLeft size={14} />
      {$t('importer.back')}
    </Button>
  </div>

  <div class="flex h-[400px] overflow-hidden rounded-md border border-edge">
    <VirtualTable {meta} data={rows} />
  </div>

  <SchemaEditor {url} />

  <div class="flex justify-end gap-2">
    <Button variant="outline" onclick={url.handleBackFromPreview}>{$t('importer.cancel')}</Button>
    <Button onclick={url.handleImportFromPreview} loading={url.isUrlImporting}>
      {#if url.isUrlImporting}
        {$t('importer.importing')}
      {:else}
        <Check size={14} />
        {$t('importer.importTable')}
      {/if}
    </Button>
  </div>

  {#if errors.length > 0}
    <ErrorAlertList {errors} />
  {/if}
</div>
