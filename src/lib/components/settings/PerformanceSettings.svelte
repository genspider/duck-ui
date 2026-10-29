<script lang="ts">
  import { t } from 'svelte-i18n'
  import { getSetting, setSetting } from '@/services/persistence/repositories/settingsRepository'
  import { DEFAULT_DUCKDB_MEMORY_LIMIT_MB } from '@/store/slices/duckdbSlice'
  import { RANGE_READS_SETTING, rangeReadsPreferred, setRangeReadsPreferred } from '@/services/duckdb/rangeReads'
  import { clampMaxResultRows, MAX_MAX_RESULT_ROWS, MIN_MAX_RESULT_ROWS } from '@/store/slices/querySlice'
  import Button from '../common/Button.svelte'
  import Input from '../common/Input.svelte'
  import FormField from '../common/FormField.svelte'
  import { duck, duckActions } from '../../stores/duck.svelte'
  import * as toast from '../../stores/toast.svelte'

  const MIN_MEMORY_MB = 256
  const MAX_MEMORY_MB = 16384

  const currentProfileId = $derived(duck((s) => s.currentProfileId))
  const storedMaxResultRows = $derived(duck((s) => s.maxResultRows))

  let memoryLimitMb = $state<number>(DEFAULT_DUCKDB_MEMORY_LIMIT_MB)
  // Draft only exists while the field is being edited. Until then the input
  // shows the live store value, which arrives asynchronously at boot.
  let maxResultRowsDraft = $state<number | null>(null)
  const maxResultRows = $derived(maxResultRowsDraft ?? storedMaxResultRows)
  let saving = $state(false)
  // Loaded with the profile, before this page can open.
  let rangeReads = $state(rangeReadsPreferred())

  $effect(() => {
    const profileId = currentProfileId
    if (!profileId) return
    let cancelled = false
    void (async () => {
      try {
        const raw = await getSetting(profileId, 'duckdb', 'memory_limit_mb')
        if (!cancelled && raw) {
          const parsed = Number(JSON.parse(raw))
          if (Number.isFinite(parsed)) memoryLimitMb = Math.floor(parsed)
        }
      } catch {
        // ignore, fall back to default
      }
    })()
    return () => {
      cancelled = true
    }
  })

  async function saveMemoryLimit() {
    if (!currentProfileId) return
    const clamped = Math.max(MIN_MEMORY_MB, Math.min(MAX_MEMORY_MB, Math.floor(memoryLimitMb || 0)))
    memoryLimitMb = clamped
    saving = true
    try {
      await setSetting(currentProfileId, 'duckdb', 'memory_limit_mb', JSON.stringify(clamped))
      toast.success($t('perf.memorySaved'))
    } catch {
      toast.error($t('perf.memorySaveFail'))
    } finally {
      saving = false
    }
  }

  async function saveRangeReads(enabled: boolean) {
    rangeReads = enabled
    // Each engine applies it before its next statement, no reload needed.
    setRangeReadsPreferred(enabled)
    if (!currentProfileId) return
    try {
      await setSetting(currentProfileId, 'duckdb', RANGE_READS_SETTING, JSON.stringify(enabled))
    } catch {
      toast.error($t('perf.rangeSaveFail'))
    }
  }

  async function saveMaxResultRows() {
    const clamped = clampMaxResultRows(maxResultRows || 0)
    maxResultRowsDraft = null
    // Applied immediately. Unlike the memory limit, nothing in the engine
    // needs restarting for a JS-side row cap.
    duckActions().setMaxResultRows(clamped)
    if (!currentProfileId) return
    saving = true
    try {
      await setSetting(currentProfileId, 'duckdb', 'max_result_rows', JSON.stringify(clamped))
      toast.success($t('perf.rowsSaved'))
    } catch {
      toast.error($t('perf.rowsSaveFail'))
    } finally {
      saving = false
    }
  }
</script>

<div class="divide-y divide-edge-subtle">
  <FormField
    layout="row"
    controlWidth="full"
    label={$t('perf.memoryLimit')}
    for="memory-limit"
    hint={$t('perf.memoryLimitHint')}
  >
    <div class="flex items-center gap-2">
      <Input
        id="memory-limit"
        type="number"
        min={MIN_MEMORY_MB}
        max={MAX_MEMORY_MB}
        step={256}
        value={memoryLimitMb}
        class="max-w-[160px]"
        oninput={(e) => (memoryLimitMb = Number(e.currentTarget.value))}
      />
      <Button size="md" variant="outline" disabled={saving || !currentProfileId} onclick={saveMemoryLimit}>{$t('common.save')}</Button>
    </div>
  </FormField>

  <FormField
    layout="row"
    controlWidth="full"
    label={$t('perf.maxRows')}
    for="max-result-rows"
    hint={$t('perf.maxRowsHint')}
  >
    <div class="flex items-center gap-2">
      <Input
        id="max-result-rows"
        type="number"
        min={MIN_MAX_RESULT_ROWS}
        max={MAX_MAX_RESULT_ROWS}
        step={1000}
        value={maxResultRows}
        class="max-w-[160px]"
        oninput={(e) => (maxResultRowsDraft = Number(e.currentTarget.value))}
      />
      <Button size="md" variant="outline" disabled={saving} onclick={saveMaxResultRows}>{$t('common.save')}</Button>
    </div>
  </FormField>

  <FormField
    layout="row"
    controlWidth="full"
    label={$t('perf.rangeReads')}
    for="range-reads"
    hint={$t('perf.rangeReadsHint')}
  >
    <label class="ds-checkbox-label">
      <input
        id="range-reads"
        type="checkbox"
        class="ds-checkbox"
        checked={rangeReads}
        onchange={(e) => saveRangeReads(e.currentTarget.checked)}
      />
      <span class="text-sm">{$t('perf.enabled')}</span>
    </label>
  </FormField>
</div>
