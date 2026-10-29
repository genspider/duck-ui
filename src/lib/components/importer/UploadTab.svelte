<script lang="ts">
  import { t } from 'svelte-i18n'
  import { Upload, X } from 'lucide-svelte'
  import Button from '../common/Button.svelte'
  import ErrorAlertList from './ErrorAlertList.svelte'
  import FileDetails from './FileDetails.svelte'
  import ImportModeSwitch from './ImportModeSwitch.svelte'
  import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/fileImporter/constants'
  import { formatFileSize } from '@/lib/fileImporter/helpers'
  import type { LocalFileImport } from '@/lib/fileImporter/localFileImport.svelte'
  import type { ImportMode, UploadError } from '@/lib/fileImporter/types'

  interface Props {
    local: LocalFileImport
    importMode: ImportMode
    onmodechange: (mode: ImportMode) => void
    errors: UploadError[]
  }

  let { local, importMode, onmodechange, errors }: Props = $props()

  let fileInput: HTMLInputElement | undefined = $state()

  const accept = Object.values(ACCEPTED_FILE_TYPES).flat().join(',')
</script>

<!-- "Upload Files" tab: drop zone, per-file settings and the import button.
     Drops are handled by the importer shell, so the whole sheet is a target. -->
<div class="flex flex-col gap-4">
  <div
    class="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors {local.isDragActive ? 'border-accent bg-accent-soft' : 'border-edge-strong'}"
  >
    <input
      bind:this={fileInput}
      type="file"
      multiple
      hidden
      {accept}
      aria-label={$t('upload.selectFiles')}
      onchange={local.handleFileInputChange}
    />
    <Upload size={28} strokeWidth={1.5} class="mb-3 {local.isDragActive ? 'text-accent' : 'text-fg-4'}" />
    {#if local.isDragActive}
      <p class="text-[13px] font-medium text-accent">{$t('upload.dropHere')}</p>
    {:else}
      <p class="text-[13px] font-medium text-fg">{$t('upload.dragOr')}</p>
      <Button class="mt-2" variant="outline" size="sm" onclick={() => fileInput?.click()}>{$t('common.selectFiles')}</Button>
      <p class="mt-3 text-xs text-fg-3">{$t('upload.supportedFormats')}</p>
      <p class="mt-0.5 text-xs text-fg-4">{$t('upload.maxFileSize')} {formatFileSize(MAX_FILE_SIZE)}</p>
    {/if}
  </div>

  {#if local.hasFilesToImport}
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-[13px] font-semibold text-fg">{$t('upload.filesToImport')}</h3>
        <div class="flex items-center gap-2">
          <span class="text-xs text-fg-3">{$t('common.mode')}:</span>
          <ImportModeSwitch value={importMode} onchange={onmodechange} tableLabel={$t('upload.tableMode')} viewLabel={$t('upload.viewMode')} />
        </div>
      </div>
      {#if importMode === 'view'}
        <p class="text-xs text-fg-3">{$t('upload.viewModeHint')}</p>
      {/if}
      {#each local.files as file (file.name)}
        <FileDetails
          {file}
          tableName={local.tableNames[file.name] ?? ''}
          ontablenamechange={(name) => local.setTableName(file.name, name)}
          status={local.importStates[file.name] ?? { fileName: file.name, status: 'pending' }}
          csvOptions={local.csvOptions[file.name]}
          oncsvoptionschange={(options) => local.setCsvOptions(file.name, options)}
          onremove={() => local.removeFile(file.name)}
          onretry={() => local.retryFileUpload(file.name)}
        />
      {/each}
    </div>
  {/if}

  {#if errors.length > 0}
    <ErrorAlertList {errors} detailed />
  {/if}

  {#if local.hasFilesToImport}
    <div class="flex gap-2">
      <Button class="flex-1" onclick={local.handleFileUpload} loading={local.isUploading}>
        {#if local.isUploading}
          {$t('upload.importing')}
        {:else}
          <Upload size={14} />
          {$t('upload.importN', { values: { count: local.files.length } })}
        {/if}
      </Button>
      {#if local.isUploading}
        <Button variant="danger" onclick={local.handleCancelUpload}>
          <X size={14} />
          {$t('common.cancel')}
        </Button>
      {/if}
    </div>
  {/if}
</div>
