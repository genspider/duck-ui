<script lang="ts">
  import Button from '../common/Button.svelte'
  import ProfileAvatar from '../profile/ProfileAvatar.svelte'
  import SessionIndicator from '../collaboration/SessionIndicator.svelte'
  import { duck } from '../../stores/duck.svelte'
  import { toggleTheme, getTheme } from '../../stores/theme.svelte'
  import { openCommandPalette } from '../../stores/command-palette.svelte'
  import { getRoute, goTo, goWorkspace } from '../../stores/router.svelte'
  import { groupForRoute, NAV_GROUPS, visibleRoutes, type NavGroup } from '@/lib/routes'
  import { t } from 'svelte-i18n'
  import { Sun, Moon, Search, SquareTerminal, PanelLeft, CircleArrowUp } from 'lucide-svelte'
  import { applyUpdate, isUpdateApplying, isUpdateAvailable } from '../../stores/update.svelte'
  import { isMobile, openDrawer } from '../../stores/layout.svelte'

  const profile = $derived(duck((s) => s.currentProfile))
  const connection = $derived(duck((s) => s.currentConnection))
  const online = $derived(duck((s) => s.isInitialized && !s.error))

  const activeGroup = $derived(groupForRoute(getRoute()))
  // One icon per group. The panel next to the rail lists the group's pages.
  const railGroups = NAV_GROUPS.filter((g) => g.id !== 'query' && g.id !== 'settings' && visibleRoutes(g).length > 0)
  const settingsGroup = NAV_GROUPS.find((g) => g.id === 'settings' && visibleRoutes(g).length > 0)

  function openGroup(group: NavGroup) {
    // Land on the group's first page; the panel lists the rest.
    const first = visibleRoutes(group)[0]
    if (first) goTo(first)
  }

  const mobile = $derived(isMobile())

  const railButton = 'relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors'
  const idle = 'text-fg-3 hover:bg-hover hover:text-fg'
</script>

{#snippet marker()}
  <span class="absolute rounded-full bg-accent {mobile ? '-top-2 left-1.5 right-1.5 h-0.5' : '-left-2 bottom-1.5 top-1.5 w-0.5'}"></span>
{/snippet}

<nav
  class="flex shrink-0 items-center bg-sidebar {mobile
    ? 'h-12 w-full flex-row justify-between gap-1 border-t border-edge-subtle px-2 pb-[env(safe-area-inset-bottom)]'
    : 'h-full w-12 flex-col border-r border-edge-subtle py-2'}"
  aria-label="Primary"
>
  {#if mobile}
    <Button icon variant="ghost" size="sm" onclick={openDrawer} title={$t('nav.openPanel')} aria-label={$t('nav.openPanel')}>
      <PanelLeft size={15} />
    </Button>
  {/if}
  <Button icon variant="ghost" size="sm" onclick={openCommandPalette} title={$t('nav.commandMenu')} aria-label={$t('nav.commandMenu')}>
    <Search size={15} />
  </Button>

  {#if !mobile}<span class="my-1.5 h-px w-5 bg-edge"></span>{/if}

  <button
    class="{railButton} {activeGroup.id === 'query' ? 'bg-active text-accent' : idle}"
    onclick={goWorkspace}
    title={$t('nav.queryWorkspace')}
    aria-label={$t('nav.queryWorkspace')}
    aria-current={activeGroup.id === 'query' ? 'page' : undefined}
  >
    {#if activeGroup.id === 'query'}{@render marker()}{/if}
    <SquareTerminal size={16} />
  </button>

  {#each railGroups as group (group.id)}
    {@const active = activeGroup.id === group.id}
    {#if group.id === 'share'}
      <!-- Its own button: the icon also carries the state of a running session. -->
      <SessionIndicator class="{railButton} {mobile ? '' : 'mt-1'} {active ? 'bg-active text-fg' : idle}" {active} onclick={() => openGroup(group)}>
        {#if active}{@render marker()}{/if}
      </SessionIndicator>
    {:else}
      <button
        class="{railButton} {mobile ? '' : 'mt-1'} {active ? 'bg-active text-fg' : idle}"
        onclick={() => openGroup(group)}
        title={group.label}
        aria-label={group.label}
        aria-current={active ? 'page' : undefined}
      >
        {#if active}{@render marker()}{/if}
        <group.icon size={16} />
      </button>
    {/if}
  {/each}

  {#if !mobile}<div class="flex-1"></div>{/if}

  {#if settingsGroup}
    {@const active = activeGroup.id === 'settings'}
    <button
      class="{railButton} {active ? 'bg-active text-fg' : idle}"
      onclick={() => openGroup(settingsGroup)}
      title={$t('settings.title')}
      aria-label={$t('settings.title')}
      aria-current={active ? 'page' : undefined}
    >
      {#if active}{@render marker()}{/if}
      <settingsGroup.icon size={16} />
    </button>
  {/if}

  {#if !mobile}<span class="my-1.5 h-px w-5 bg-edge"></span>{/if}

  {#if isUpdateAvailable()}
    <!-- A new build is active in the service worker; this reload picks it up. -->
    <button
      class="{railButton} {mobile ? '' : 'mb-1'} bg-accent-soft text-accent hover:bg-hover disabled:opacity-60"
      onclick={() => void applyUpdate()}
      disabled={isUpdateApplying()}
      title={$t('nav.updateReady')}
      aria-label={$t('nav.updateReady')}
    >
      <CircleArrowUp size={16} />
    </button>
  {/if}

  {#if !mobile}
    <span
      class="my-1 h-1.5 w-1.5 rounded-full {online ? 'bg-success' : 'bg-danger'}"
      title={$t('nav.connectionStatus', { values: { name: connection?.name ?? 'DuckDB', status: online ? $t('connection.connected') : $t('connection.disconnected') } })}
      role="img"
      aria-label={online ? $t('connection.connected') : $t('connection.disconnected')}
    ></span>
  {/if}

  <Button icon variant="ghost" size="sm" onclick={toggleTheme} title={$t('nav.toggleTheme')} aria-label={$t('nav.toggleTheme')}>
    {#if getTheme() === 'dark'}<Sun size={15} />{:else}<Moon size={15} />{/if}
  </Button>

  {#if profile && settingsGroup}
    <button
      class="{mobile ? 'hidden' : 'mt-1 inline-flex'} h-7 w-7 items-center justify-center rounded-md hover:bg-hover"
      onclick={() => goTo('settings', 'profile')}
      title={profile.name}
      aria-label={$t('nav.profile', { values: { name: profile.name } })}
    >
      <ProfileAvatar avatarEmoji={profile.avatarEmoji} size="sm" />
    </button>
  {/if}
</nav>
