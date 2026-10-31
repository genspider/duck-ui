<script lang="ts">
  import { Check, Copy, Eye, Pencil, Radio } from 'lucide-svelte'
  import { t } from 'svelte-i18n'
  import Button from '../common/Button.svelte'
  import Input from '../common/Input.svelte'
  import Sheet from '../common/Sheet.svelte'
  import * as toast from '../../stores/toast.svelte'
  import { buildDashboardShareUrl, encodeDashboardShare, type DashboardShareMode } from '@/services/dashboard/share'
  import type { Dashboard } from '@/services/dashboard/types'

  /**
   * Share a dashboard, with roles.
   *
   * Viewer and editor are links carrying the SOURCE, never results, never
   * credentials. Live is the collaborative session, where editing is genuinely
   * shared and access is genuinely revocable.
   */
  interface Props {
    open: boolean
    onclose: () => void
    dashboard: Dashboard
    /** Opens the workspace level Share Live flow. Without it the Live option is not offered. */
    onsharelive?: () => void
  }

  let { open, onclose, dashboard, onsharelive }: Props = $props()

  const uid = $props.id()
  const PENDING = '…'

  const ROLES: { mode: DashboardShareMode; icon: typeof Eye; title: string; caption: string }[] = [
    { mode: 'viewer', icon: Eye, title: $t('dashboard.shareViewer'), caption: $t('dashboard.shareViewerCaption') },
    { mode: 'editor', icon: Pencil, title: $t('dashboard.shareEditor'), caption: $t('dashboard.shareEditorCaption') },
  ]

  let links = $state<Record<DashboardShareMode, string> | null>(null)
  let copied = $state<DashboardShareMode | null>(null)
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    if (!open) return
    const { name, source, refreshIntervalSeconds } = dashboard
    let cancelled = false
    void Promise.all(
      (['viewer', 'editor'] as const).map((mode) => encodeDashboardShare({ mode, name, source })),
    ).then(([viewer, editor]) => {
      if (cancelled) return
      const options = { refreshSeconds: refreshIntervalSeconds }
      links = {
        viewer: buildDashboardShareUrl(viewer, options),
        editor: buildDashboardShareUrl(editor, options),
      }
    })
    return () => {
      cancelled = true
    }
  })

  $effect(() => () => clearTimeout(copiedTimer))

  async function copy(mode: DashboardShareMode) {
    if (!links) return
    try {
      await navigator.clipboard.writeText(links[mode])
    } catch {
      toast.error('Could not copy the link. Select it and copy by hand')
      return
    }
    copied = mode
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied = null), 1500)
    toast.success('Link copied')
  }
</script>

<Sheet
  {open}
  {onclose}
  size="md"
  title={$t('dashboard.shareTitle', { values: { name: dashboard.name } })}
  description={$t('dashboard.shareDesc')}
>
  <div class="flex flex-col gap-4">
    {#each ROLES as role (role.mode)}
      {@const Icon = role.icon}
      <div class="flex flex-col gap-1.5">
        <label for="{uid}-{role.mode}" class="flex items-center gap-1.5 text-xs font-medium text-fg">
          <Icon size={13} />
          {role.title}
        </label>
        <div class="flex gap-2">
          <Input id="{uid}-{role.mode}" readonly mono size="sm" value={links?.[role.mode] ?? PENDING} />
          <Button
            icon
            size="sm"
            variant="outline"
            disabled={!links}
            onclick={() => copy(role.mode)}
            aria-label={$t('dashboard.copyLink', { values: { role: role.title } })}
          >
            {#if copied === role.mode}<Check size={14} />{:else}<Copy size={14} />{/if}
          </Button>
        </div>
        <p class="text-xs text-fg-3">{role.caption}</p>
      </div>
    {/each}

    {#if onsharelive}
      <div class="flex flex-col gap-1.5 rounded-md border border-edge p-3">
        <span class="flex items-center gap-1.5 text-xs font-medium text-fg">
          <Radio size={13} class="text-accent" />
          {$t('dashboard.shareLive')}
        </span>
        <p class="text-xs text-fg-3">
          {$t('dashboard.shareLiveDesc')}
        </p>
        <Button size="sm" variant="outline" class="mt-1 self-start" onclick={onsharelive}>
          {$t('dashboard.startLive')}
        </Button>
      </div>
    {/if}
  </div>
</Sheet>
