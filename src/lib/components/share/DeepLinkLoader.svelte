<script lang="ts">
  import { t } from 'svelte-i18n'
  import { tr } from '@/lib/i18n/translate'
  import { ExternalLink, ShieldAlert } from 'lucide-svelte'
  import Modal from '../common/Modal.svelte'
  import Button from '../common/Button.svelte'
  import { duck, duckActions } from '../../stores/duck.svelte'
  import * as toast from '../../stores/toast.svelte'
  import { buildSourceSQL, defaultDeepLinkQuery, isLikelyCorsError } from '@/lib/deepLink'
  import { clearSearchParams, loadQueryFromURL, readDeepLinkRequest } from '@/lib/urlLoaders'


  /*
   * Handles everything a link can ask the app to open.
   *
   * "Open in Duck-UI" links (`?load=<url>&sql=...`) arrive from strangers'
   * READMEs, so nothing runs on arrival: a confirmation lists every remote
   * host and the SQL, and only after the user accepts do we attach the
   * sources and open or run the query. Kiosk deployments with imports hidden
   * ignore these links entirely.
   *
   * Shared analyses (`#s=`) and legacy `?query=` links carry only a query, and
   * open in a new tab as soon as the engine is ready.
   */
  const initialized = $derived(duck((s) => s.isInitialized))

  let loading = $state(false)
  let dismissed = $state(false)

  // The URL is read once the engine is up, and again only after a dismiss,
  // which is also what empties it.
  const request = $derived(initialized && !dismissed ? readDeepLinkRequest() : null)
  const sqlLines = $derived(request?.sql ? request.sql.split('\n').length : 0)

  $effect(() => {
    if (initialized) loadQueryFromURL()
  })

  function hostOf(url: string): string {
    try {
      return new URL(url.replace(/^ducklake:/, '')).host
    } catch {
      return url
    }
  }

  function dismiss() {
    dismissed = true
    clearSearchParams()
  }

  function close() {
    if (!loading) dismiss()
  }

  async function load(run: boolean) {
    if (!request) return
    const { connection, currentSession, fetchDatabasesAndTablesInfo, createTab, executeQuery } = duckActions()
    // Deep links attach into the in-browser engine; on a connection that
    // executes elsewhere the loaded sources would be invisible. Keep the
    // dialog open so the link isn't consumed.
    if (!connection || !currentSession?.capabilities.supportsFileImport) {
      toast.error('Shared data loads into the in-browser DuckDB engine', {
        description: $t('share.deepLinkSwitchDesc'),
      })
      return
    }
    loading = true

    try {
      for (const source of request.sources) {
        try {
          await connection.query(buildSourceSQL(source))
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (isLikelyCorsError(message)) {
            toast.error(tr('share.corsHint', { host: hostOf(source.url) }))
          } else {
            toast.error(tr('share.failedLoad', { name: source.name, message }))
          }
          throw error
        }
      }

      await fetchDatabasesAndTablesInfo()

      const sql = request.sql ?? defaultDeepLinkQuery(request.sources)
      const tabId = createTab('sql', sql, request.sources[0]?.name ?? 'Shared data')
      toast.success(
        request.sources.length === 1 ? tr('share.loadedSource', { name: request.sources[0].name }) : tr('share.loadedSources', { count: request.sources.length }),
      )

      if (run && sql.trim() && tabId) {
        setTimeout(() => {
          void executeQuery(sql, tabId)
        }, 100)
      }
    } catch {
      // Source-level errors already surfaced above.
    } finally {
      loading = false
      dismiss()
    }
  }
</script>

{#if request}
  <Modal open onclose={close} title={$t('share.openTitle')} description={$t('share.openDesc')}>
    <div class="flex flex-col gap-3 text-[13px] text-fg-2">
      <ul class="flex flex-col gap-1">
        {#each request.sources as source (source.url)}
          <li class="flex items-start gap-2 font-mono text-xs">
            <ExternalLink size={14} class="mt-0.5 shrink-0 text-fg-4" />
            <span class="break-all text-fg">
              {source.url}
              <span class="text-fg-3">→ attaches as {source.name}</span>
            </span>
          </li>
        {/each}
      </ul>

      {#if request.sql}
        <p>and run this SQL ({sqlLines} {sqlLines === 1 ? $t('share.line') : $t('share.lines')}, scroll to read all of it):</p>
        <pre class="max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-2 font-mono text-xs text-fg">{request.sql}</pre>
      {/if}

      <p class="flex items-start gap-2 text-xs text-fg-3">
        <ShieldAlert size={14} class="mt-0.5 shrink-0" />
        <span>
          {$t('share.deepLinkRunLocal')}
        </span>
      </p>
    </div>

    {#snippet footer()}
      <Button variant="ghost" onclick={dismiss} disabled={loading}>{$t('common.cancel')}</Button>
      <Button variant="outline" onclick={() => load(false)} disabled={loading}>{$t('share.loadOnly')}</Button>
      <Button onclick={() => load(request.autoRun)} loading={loading}>
        {loading ? $t('common.loading') : request.autoRun ? $t('share.loadAndRun') : $t('common.load')}
      </Button>
    {/snippet}
  </Modal>
{/if}
