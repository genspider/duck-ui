<script lang="ts">
  import { t } from 'svelte-i18n'
  import { tr } from '@/lib/i18n/translate'
  import { ChartColumn, FileText, Gauge, Sparkles, Square } from 'lucide-svelte'
  import Button from '../common/Button.svelte'
  import ContextMenu, { type ContextMenuItem } from '../common/ContextMenu.svelte'
  import Modal from '../common/Modal.svelte'
  import Lazy from '../common/Lazy.svelte'
  import { duck, duckActions } from '../../stores/duck.svelte'
  import * as toast from '../../stores/toast.svelte'
  import type { QueryResult } from '@/store'
  import { getUiConfig } from '@/lib/appConfig'
  import { runQuery } from '@/services/engine'
  import { isNumericColumn } from '@/lib/chartDataTransform'
  import { autoDetectChartConfig } from '@/lib/chartAutoConfig'
  import { extractPlanText } from '@/lib/explainPlan'
  import { missingParamsMessage, resolveQueryParams } from '@/lib/sqlParams'
  import { formatSchemaForContext } from '@/lib/duckBrain/schemaFormatter'
  import {
    buildExplainResultsMessages,
    buildOptimizeQueryMessages,
    buildSuggestChartMessages,
    RESULT_SAMPLE_MAX_CELL_CHARS,
    RESULT_SAMPLE_MAX_ROWS,
  } from '@/lib/duckBrain/prompts/result-actions'
  import {
    isSingleReadOnlyQuery,
    parseExplanation,
    parseOptimizeResponse,
    resolveChartSuggestion,
  } from '@/lib/duckBrain/actionParsers'
  import { describeProviderDestination, requiresDataConsent } from '@/lib/duckBrain/privacy'

  /**
   * Duck Brain actions on a finished result: explain it, optimize the query,
   * suggest a chart. Explain is the only one that sends result values, so it
   * asks for consent on every use unless the model runs in this browser.
   */

  type BrainAction = 'explain' | 'optimize' | 'chart'

  type ActionOutcome =
    | { kind: 'explain'; summary: string }
    | { kind: 'optimize'; sql: string; reasons: string; unchanged: boolean }

  interface Props {
    tabId: string
    sql: string
    result: QueryResult
    /** Called after a suggested chart config is applied, e.g. to show the Charts view. */
    onchartapplied?: () => void
  }

  let { tabId, sql, result, onchartapplied }: Props = $props()

  const MENU_WIDTH = 220

  const aiProvider = $derived(duck((s) => s.duckBrain.aiProvider))
  const providerConfigs = $derived(duck((s) => s.duckBrain.providerConfigs))

  let busy = $state<BrainAction | null>(null)
  // Stop for the running action. Not state: only handlers read it.
  let controller: AbortController | null = null
  // A new result replaces this component; its request has nowhere to land.
  $effect(() => () => controller?.abort())
  let consentOpen = $state(false)
  let outcome = $state<ActionOutcome | null>(null)
  let menu = $state<{ x: number; y: number } | null>(null)

  const destination = $derived(
    describeProviderDestination(aiProvider, aiProvider === 'webllm' ? undefined : providerConfigs[aiProvider]),
  )

  /** Starts an action: `busy` for the button, a fresh signal for Stop. */
  function begin(action: BrainAction): AbortSignal {
    controller?.abort()
    controller = new AbortController()
    busy = action
    return controller.signal
  }

  function stop() {
    controller?.abort()
    controller = null
    busy = null
  }

  async function runExplain() {
    const signal = begin('explain')
    try {
      const response = await duckActions().runBrainTask(buildExplainResultsMessages(sql, result), {
        maxTokens: 700,
        signal,
      })
      if (response === null) return
      const summary = parseExplanation(response)
      if (!summary) {
        toast.error(tr('brain.emptyExplanation'))
        return
      }
      outcome = { kind: 'explain', summary }
    } finally {
      if (controller?.signal === signal) {
        controller = null
        busy = null
      }
    }
  }

  function handleExplain() {
    // Never send result values silently: ask every time for network providers.
    if (requiresDataConsent(aiProvider)) {
      consentOpen = true
      return
    }
    void runExplain()
  }

  function confirmConsent() {
    consentOpen = false
    void runExplain()
  }

  async function handleOptimize() {
    if (!isSingleReadOnlyQuery(sql)) {
      toast.info(tr('brain.optimizeReadonly'))
      return
    }
    const { currentSession, maxResultRows, databases, tabs, runBrainTask } = duckActions()
    if (!currentSession) {
      toast.error(tr('brain.noActiveConnection'))
      return
    }
    // EXPLAIN needs the $param values bound, the model still sees the placeholders.
    const resolved = resolveQueryParams(sql, tabs.find((t) => t.id === tabId)?.queryParams)
    if (resolved.sql === null) {
      toast.error(missingParamsMessage(resolved.missing))
      return
    }
    const signal = begin('optimize')
    try {
      // Plain EXPLAIN: plans the query without running it again.
      const explained = await runQuery(
        currentSession,
        `EXPLAIN ${resolved.sql.trim().replace(/;+\s*$/, '')}`,
        'duck-brain',
        { maxRows: maxResultRows },
      )
      if (signal.aborted) return
      if (explained.error) {
        toast.error(tr('brain.explainFailed', { message: explained.error }))
        return
      }
      const plan = extractPlanText(explained.data)
      const schema = formatSchemaForContext(databases).formatted
      const response = await runBrainTask(buildOptimizeQueryMessages(sql, plan, schema), {
        maxTokens: 1200,
        signal,
      })
      if (response === null) return
      const parsed = parseOptimizeResponse(response, sql)
      if (!parsed.ok) {
        toast.error(parsed.error)
        return
      }
      outcome = { kind: 'optimize', sql: parsed.sql, reasons: parsed.reasons, unchanged: parsed.unchanged }
    } catch (error) {
      toast.error(tr('brain.optimizeFailed', { message: error instanceof Error ? error.message : 'Unknown error' }))
    } finally {
      if (controller?.signal === signal) {
        controller = null
        busy = null
      }
    }
  }

  async function handleSuggestChart() {
    const numericColumns = result.columns.filter((col) => isNumericColumn(result.data, col))
    if (numericColumns.length === 0) {
      toast.info(tr('brain.noNumericColumn'))
      return
    }
    const signal = begin('chart')
    try {
      // Column names and types only: no values leave the browser.
      const columns = result.columns.map((name, i) => ({
        name,
        type: result.columnTypes[i] ?? 'unknown',
        numeric: numericColumns.includes(name),
      }))
      const response = await duckActions().runBrainTask(buildSuggestChartMessages(columns), {
        maxTokens: 300,
        signal,
      })
      if (response === null) return
      const { config, fromModel } = resolveChartSuggestion(
        response,
        { columns: result.columns, numericColumns },
        autoDetectChartConfig(result),
      )
      duckActions().updateTabChartConfig(tabId, config)
      onchartapplied?.()
      if (fromModel) {
        toast.success(tr('brain.chartSuggested'))
      } else {
        toast.warning(tr('brain.chartUnusable'))
      }
    } finally {
      if (controller?.signal === signal) {
        controller = null
        busy = null
      }
    }
  }

  function handleApplyOptimized() {
    if (outcome?.kind !== 'optimize') return
    duckActions().updateTabQuery(tabId, outcome.sql)
    outcome = null
    toast.success(tr('brain.rewriteApplied'))
  }

  const menuItems: ContextMenuItem[] = [
    { id: 'explain', label: $t('brain.explain'), icon: FileText, onSelect: handleExplain },
    { id: 'optimize', label: $t('brain.optimize'), icon: Gauge, onSelect: () => void handleOptimize() },
    { id: 'chart', label: $t('brain.suggestChart'), icon: ChartColumn, onSelect: () => void handleSuggestChart() },
  ]

  function toggleMenu(e: MouseEvent) {
    if (menu) {
      menu = null
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // Right-aligned under the button, like the old dropdown.
    menu = { x: rect.right - MENU_WIDTH, y: rect.bottom + 4 }
  }
</script>

{#if !getUiConfig().hideBrain}
  <Button
    size="xs"
    variant="ghost"
    disabled={busy !== null}
    aria-expanded={menu !== null}
    onclick={toggleMenu}
  >
    {#if busy}
      <span class="inline-flex" role="status" aria-label={$t('brain.thinking')}><Sparkles size={14} class="animate-pulse" /></span>
      {$t('brain.thinking')}
    {:else}
      <Sparkles size={14} />
      Duck Brain
    {/if}
  </Button>
  {#if busy}
    <Button size="xs" variant="ghost" icon title={$t('brain.stop')} aria-label={$t('brain.stop')} onclick={stop}>
      <Square size={12} />
    </Button>
  {/if}

  <ContextMenu open={menu !== null} x={menu?.x ?? 0} y={menu?.y ?? 0} items={menuItems} onclose={() => (menu = null)} />

  <Modal
    open={consentOpen}
    title={$t('brain.sendToTitle', { values: { destination } })}
    size="md"
    onclose={() => (consentOpen = false)}
  >
    <div class="space-y-2 text-[13px] leading-relaxed text-fg-2">
      <p>
        {$t('brain.consentExplain')} <strong class="font-semibold text-fg">{destination}</strong>：
      </p>
      <ul class="list-disc space-y-1 pl-5">
        <li>{$t('brain.consentBulletQuery')}</li>
        <li>
          {$t('brain.consentBulletRows', { values: { max: RESULT_SAMPLE_MAX_ROWS, chars: RESULT_SAMPLE_MAX_CELL_CHARS } })}
        </li>
        <li>{$t('brain.consentBulletStats')}</li>
      </ul>
      <p>{$t('brain.consentMsg')}</p>
    </div>
    {#snippet footer()}
      <Button size="sm" variant="outline" onclick={() => (consentOpen = false)}>{$t('common.cancel')}</Button>
      <Button size="sm" onclick={confirmConsent}>{$t('brain.sendAndExplain')}</Button>
    {/snippet}
  </Modal>

  <!-- This sits in every SQL tab. The markdown renderer is fetched when an
       answer is shown, so it stays out of the startup bundle. -->
  {#snippet markdown(content: string)}
    <Lazy load={() => import('./MarkdownContent.svelte')} props={{ content }} />
  {/snippet}

  <Modal
    open={outcome !== null}
    title={outcome?.kind === 'optimize' ? $t('brain.optimizedQuery') : $t('brain.resultExplanation')}
    description={outcome?.kind === 'optimize'
      ? outcome.unchanged
        ? $t('brain.alreadyEfficient')
        : $t('brain.descOptimized')
      : $t('brain.descExplained')}
    size="lg"
    onclose={() => (outcome = null)}
    footer={outcome?.kind === 'optimize' && !outcome.unchanged ? applyFooter : undefined}
  >
    {#if outcome?.kind === 'explain'}
      {@render markdown(outcome.summary)}
    {:else if outcome?.kind === 'optimize'}
      <div class="space-y-3">
        <!-- SQL from the model is rendered as text, never as HTML. -->
        <pre class="overflow-x-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-mono text-xs text-fg">{outcome.sql}</pre>
        {#if outcome.reasons}
          {@render markdown(outcome.reasons)}
        {/if}
      </div>
    {/if}
  </Modal>
{/if}

{#snippet applyFooter()}
  <Button size="sm" variant="outline" onclick={() => (outcome = null)}>{$t('common.close')}</Button>
  <Button size="sm" onclick={handleApplyOptimized}>{$t('brain.applyToEditor')}</Button>
{/snippet}
