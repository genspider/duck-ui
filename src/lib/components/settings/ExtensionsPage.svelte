<script lang="ts">
  import { t } from 'svelte-i18n'
  import PageHeader from '../common/PageHeader.svelte'
  import PageBody from '../common/PageBody.svelte'
  import Badge from '../common/Badge.svelte'
  import ExtensionsSettings from './ExtensionsSettings.svelte'
  import { duck } from '../../stores/duck.svelte'

  const connection = $derived(duck((s) => s.currentConnection))
  // Each connection has its own set of installed and loaded extensions, so
  // the list is rebuilt when the active connection changes.
  const sessionId = $derived(duck((s) => s.currentSession?.id))
</script>

<PageHeader title={$t('ext.extensions')} subtitle={$t('ext.subtitle')}>
  {#snippet meta()}
    {#if connection}<Badge tone="brand">{connection.name}</Badge>{/if}
  {/snippet}
</PageHeader>

<PageBody>
  <div class="max-w-4xl">
    {#key sessionId ?? 'none'}
      <ExtensionsSettings />
    {/key}
  </div>
</PageBody>
