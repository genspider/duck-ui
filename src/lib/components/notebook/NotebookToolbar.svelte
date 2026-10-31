<script lang="ts">
  import { Play, Plus } from 'lucide-svelte'
  import { t } from 'svelte-i18n'
  import Button from '../common/Button.svelte'
  import Badge from '../common/Badge.svelte'
  import AddCellMenu from './AddCellMenu.svelte'
  import type { NotebookCellType } from '@/store/types'

  export type KernelState = 'off' | 'idle' | 'busy'

  interface Props {
    onrunall: () => void
    onaddcell: (type: NotebookCellType) => void
    running: boolean
    cellCount: number
    /** Shown only when the notebook has Python cells. */
    kernel?: KernelState
    /** What the kernel reports while it works, such as a package download. */
    kernelStatus?: string
  }

  let { onrunall, onaddcell, running, cellCount, kernel, kernelStatus = '' }: Props = $props()

  const kernelLabel = $derived(
    kernel === 'busy' ? kernelStatus || $t('notebook.python.running') : kernel === 'idle' ? $t('notebook.python.ready') : $t('notebook.python.notStarted'),
  )
</script>

<div class="flex h-10 shrink-0 items-center gap-1 border-b border-edge-subtle px-2">
  <Button size="sm" variant="outline" onclick={onrunall} loading={running}>
    {#if !running}<Play size={12} />{/if}
    {running ? $t('common.running') : $t('notebook.runAll')}
  </Button>

  <AddCellMenu
    onadd={onaddcell}
    class="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-fg-3 transition-colors duration-100 hover:bg-hover hover:text-fg"
  >
    <Plus size={13} />
    {$t('notebook.addCell')}
  </AddCellMenu>

  <div class="ml-auto flex min-w-0 items-center gap-3">
    {#if kernel}
      <Badge
        dot
        tone={kernel === 'busy' ? 'info' : kernel === 'idle' ? 'success' : 'neutral'}
        class="min-w-0 text-fg-3"
        title={$t('notebook.kernelHint')}
      >
        <span class="truncate" aria-live="polite">{kernelLabel}</span>
      </Badge>
    {/if}
    <span class="shrink-0 text-xs text-fg-3">{cellCount === 1 ? $t('notebook.cellCount', { values: { count: cellCount } }) : $t('notebook.cellCount_plural', { values: { count: cellCount } })}</span>
  </div>
</div>
