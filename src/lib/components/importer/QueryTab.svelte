<script lang="ts">
  import { t } from 'svelte-i18n'
  import { Code } from 'lucide-svelte'
  import Button from '../common/Button.svelte'
  import Input from '../common/Input.svelte'
  import Textarea from '../common/Textarea.svelte'
  import FormField from '../common/FormField.svelte'
  import ErrorAlertList from './ErrorAlertList.svelte'
  import ImportModeSwitch from './ImportModeSwitch.svelte'
  import type { QueryImport } from '@/lib/fileImporter/queryImport.svelte'
  import type { ImportMode, UploadError } from '@/lib/fileImporter/types'

  interface Props {
    query: QueryImport
    importMode: ImportMode
    onmodechange: (mode: ImportMode) => void
    errors: UploadError[]
  }

  let { query, importMode, onmodechange, errors }: Props = $props()

  const examples = [
    { label: $t('queryTab.exampleFromUrl'), sql: "SELECT * FROM read_csv('https://example.com/data.csv')" },
    { label: $t('queryTab.exampleFilter'), sql: "SELECT * FROM read_json('data.json') WHERE age > 21" },
    { label: $t('queryTab.exampleJoin'), sql: 'SELECT a.*, b.name FROM table1 a JOIN table2 b ON a.id = b.id' },
  ]
</script>

<!-- "From Query" tab: materialize a SQL query result as a table or view. -->
<div class="flex flex-col gap-4">
  <div>
    <h3 class="text-[13px] font-semibold text-fg">{$t('queryTab.title')}</h3>
    <p class="mt-1 text-[13px] text-fg-3">
      {$t('queryTab.desc')}
    </p>
  </div>

  <FormField
    controlWidth="full"
    label={$t('queryTab.sqlQuery')}
    for="query-input"
    hint={$t('queryTab.sqlHint')}
  >
    <Textarea
      id="query-input"
      mono
      rows={8}
      bind:value={query.queryInput}
      placeholder={$t('queryTab.sqlPlaceholder')}
      disabled={query.isQueryImporting}
    />
  </FormField>

  <FormField controlWidth="full" label={$t('queryTab.name')} for="query-table-name">
    <Input id="query-table-name" mono bind:value={query.queryTableName} placeholder={$t('queryTab.namePlaceholder')} disabled={query.isQueryImporting} />
  </FormField>

  <div>
    <p class="mb-1 text-xs font-medium text-fg-2">{$t('queryTab.saveAs')}</p>
    <ImportModeSwitch block label={$t('queryTab.saveAs')} value={importMode} onchange={onmodechange} disabled={query.isQueryImporting} />
    <p class="mt-1 text-xs text-fg-3">
      {importMode === 'view' ? $t('queryTab.saveAsHintView') : $t('queryTab.saveAsHintTable')}
    </p>
  </div>

  <div class="rounded-md border border-edge-subtle bg-surface p-3">
    <h4 class="text-xs font-medium text-fg-2">{$t('queryTab.exampleQueries')}</h4>
    <dl class="mt-2 flex flex-col gap-2 text-xs">
      {#each examples as example (example.label)}
        <div>
          <dt class="text-fg-2">{example.label}</dt>
          <dd class="mt-0.5 break-all font-mono text-fg-3">{example.sql}</dd>
        </div>
      {/each}
    </dl>
  </div>

  {#if errors.length > 0}
    <ErrorAlertList {errors} />
  {/if}

  <Button class="w-full" onclick={query.handleQueryImport} loading={query.isQueryImporting}>
    {#if query.isQueryImporting}
      {$t('queryTab.executing')}
    {:else}
      <Code size={14} />
      {$t('queryTab.executeAndImport')}
    {/if}
  </Button>
</div>
