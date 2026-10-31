<script lang="ts">
  import type { Snippet } from 'svelte'
  import { t } from 'svelte-i18n'
  import { Code, SquareTerminal, Type } from 'lucide-svelte'
  import ContextMenu, { type ContextMenuItem } from '../common/ContextMenu.svelte'
  import type { NotebookCellType } from '@/store/types'

  interface Props {
    onadd: (type: NotebookCellType) => void
    /** Classes of the trigger button. */
    class?: string
    ariaLabel?: string
    /** Where the menu opens relative to the trigger. */
    align?: 'start' | 'center'
    children: Snippet
  }

  let { onadd, class: cls = '', ariaLabel, align = 'start', children }: Props = $props()

  // ContextMenu has a min width of 220px; half of it centers the menu.
  const MENU_HALF_WIDTH = 110

  let menu = $state<{ x: number; y: number } | null>(null)

  // $derived so labels follow a locale change.
  const items: ContextMenuItem[] = $derived([
    { id: 'sql', label: $t('notebook.cell.sql'), icon: Code, onSelect: () => onadd('sql') },
    { id: 'python', label: $t('notebook.cell.python'), icon: SquareTerminal, onSelect: () => onadd('python') },
    { id: 'markdown', label: $t('notebook.cell.markdown'), icon: Type, onSelect: () => onadd('markdown') },
  ])

  function toggle(e: MouseEvent) {
    if (menu) {
      menu = null
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = align === 'center' ? rect.left + rect.width / 2 - MENU_HALF_WIDTH : rect.left
    menu = { x, y: rect.bottom + 4 }
  }
</script>

<button
  type="button"
  class={cls}
  aria-label={ariaLabel}
  aria-haspopup="menu"
  aria-expanded={menu !== null}
  onclick={toggle}
>
  {@render children()}
</button>

<ContextMenu open={menu !== null} x={menu?.x ?? 0} y={menu?.y ?? 0} {items} onclose={() => (menu = null)} />
