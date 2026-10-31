<script lang="ts">
  import { t } from 'svelte-i18n'
  import { Check, Copy, ShieldCheck, UserPlus, Waypoints } from 'lucide-svelte'
  import Button from '../common/Button.svelte'
  import Input from '../common/Input.svelte'
  import Textarea from '../common/Textarea.svelte'
  import FormField from '../common/FormField.svelte'
  import { duck, duckActions } from '../../stores/duck.svelte'
  import * as toast from '../../stores/toast.svelte'
  import type { ShareSelection } from '@/services/collaboration/liveSession'
  import { isTurnConfigured, verifyTurnRelay, type TurnCheckResult } from '@/services/collaboration/signaling/client'

  /*
   * Host side of a live session (§44): the setup form, then the invite steps.
   *
   * Deliberately explicit about data access. The default is NO data access:
   * sharing a workspace and sharing your database are different decisions, and
   * conflating them is how people accidentally hand over more than they meant.
   */
  type ShareMode = 'none' | 'all' | 'selected'

  const MODES: { id: ShareMode; label: string; hint: string }[] = [
    { id: 'none', label: $t('liveSession.dataAccess.none'), hint: $t('liveSession.dataAccess.noneHint') },
    {
      id: 'all',
      label: $t('liveSession.dataAccess.all'),
      hint: $t('liveSession.dataAccess.allHint'),
    },
    {
      id: 'selected',
      label: $t('liveSession.dataAccess.selected'),
      hint: $t('liveSession.dataAccess.selectedHint'),
    },
  ]

  const uid = $props.id()
  const session = $derived(duck((s) => s.session))
  const profileName = $derived(duck((s) => s.currentProfile?.name))

  let sessionNameDraft = $state<string | null>(null)
  let tables = $state<ShareSelection[]>([])
  let selected = $state<ReadonlySet<string>>(new Set())
  let shareMode = $state<ShareMode>('none')
  let rowLimit = $state(100_000)
  let guestCode = $state('')
  let copied = $state(false)
  let turnCheck = $state<TurnCheckResult | 'checking' | null>(null)

  const sessionName = $derived(sessionNameDraft ?? $t('liveSession.mySession', { values: { name: profileName ?? '' } }))
  const isStarting = $derived(session.status === 'connecting')
  const hasInvite = $derived(Boolean(session.inviteUrl))
  const isConnected = $derived(session.status === 'connected')
  const people = $derived(session.participants.length)

  $effect(() => {
    let cancelled = false
    void duckActions()
      .listShareableTables()
      .then((list) => {
        if (!cancelled) tables = list
      })
    return () => {
      cancelled = true
    }
  })

  function toggleTable(name: string) {
    const next = new Set(selected)
    if (!next.delete(name)) next.add(name)
    selected = next
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      copied = true
      setTimeout(() => (copied = false), 1500)
      toast.success($t('liveSession.copied'))
    } catch {
      toast.error($t('liveSession.copyFailed'))
    }
  }

  async function start() {
    const shared = shareMode === 'selected' ? tables.filter((t) => selected.has(t.exposedName)) : []
    await duckActions().startLiveSession({
      sessionName: sessionName.trim() || 'Live session',
      shared,
      shareAll: shareMode === 'all',
      maxResultRows: rowLimit,
    })
  }

  async function connect() {
    await duckActions().acceptGuestCode(guestCode)
    guestCode = ''
  }

  async function testRelay() {
    turnCheck = 'checking'
    turnCheck = await verifyTurnRelay()
  }
</script>

{#snippet rowLimitField(id: string)}
  <FormField label={$t('liveSession.resultLimit')} for={id} controlWidth="sm">
    <Input
      {id}
      type="number"
      size="sm"
      min={100}
      step={1000}
      value={rowLimit}
      oninput={(e) => (rowLimit = Number(e.currentTarget.value))}
    />
  </FormField>
{/snippet}

{#if !hasInvite}
  <div class="flex flex-col gap-5">
    <FormField label={$t('liveSession.sessionName')} for="{uid}-name" controlWidth="full">
      <Input
        id="{uid}-name"
        value={sessionName}
        placeholder={$t('liveSession.sessionNamePlaceholder')}
        oninput={(e) => (sessionNameDraft = e.currentTarget.value)}
      />
    </FormField>

    <fieldset class="flex flex-col gap-3">
      <legend class="mb-2 text-xs font-medium text-fg-2">{$t('liveSession.dataAccess')}</legend>
      {#each MODES as mode (mode.id)}
        <label class="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            class="ds-radio mt-0.5"
            name="{uid}-mode"
            value={mode.id}
            checked={shareMode === mode.id}
            onchange={() => (shareMode = mode.id)}
          />
          <span class="grid gap-0.5">
            <span class="text-[13px] font-medium leading-none text-fg">{mode.label}</span>
            <span class="text-xs text-fg-3">{mode.hint}</span>
          </span>
        </label>
      {/each}
    </fieldset>

    {#if shareMode === 'all'}
      <div class="flex flex-col gap-2 rounded-md border border-edge-subtle p-3">
        {@render rowLimitField(`${uid}-limit-all`)}
        <p class="text-xs text-fg-3">
          {#if tables.length === 0}
            {$t('liveSession.noTablesAll')}
          {:else}
            {$t('liveSession.tablesCount', { values: { count: tables.length } })}
          {/if}
        </p>
      </div>
    {/if}

    {#if shareMode === 'selected'}
      <div class="flex flex-col gap-3 rounded-md border border-edge-subtle p-3">
        <p class="text-[11px] font-medium uppercase tracking-wide text-fg-3">{$t('liveSession.tables')}</p>
        <div class="flex max-h-40 flex-col gap-2 overflow-y-auto pr-3">
          {#if tables.length === 0}
            <p class="text-xs text-fg-3">{$t('liveSession.noTables')}</p>
          {/if}
          {#each tables as table (table.qualifiedName)}
            <label class="ds-checkbox-label">
              <input
                type="checkbox"
                class="ds-checkbox"
                checked={selected.has(table.exposedName)}
                onchange={() => toggleTable(table.exposedName)}
              />
              <span class="font-mono text-xs">{table.exposedName}</span>
            </label>
          {/each}
        </div>
        {@render rowLimitField(`${uid}-limit`)}
      </div>
    {/if}

    <div class="flex items-start gap-2 rounded-md bg-surface-2 p-3 text-xs text-fg-3">
      <ShieldCheck size={14} class="mt-0.5 shrink-0 text-success" />
      <span>{$t('liveSession.privacyNote')}</span>
    </div>

    {#if isTurnConfigured()}
      <div class="flex items-start gap-2 text-xs text-fg-3">
        <Waypoints size={14} class="mt-0.5 shrink-0" />
        <span class="flex-1">
          {#if turnCheck === null}
            {$t('liveSession.turnRelay')}
            <button type="button" class="underline underline-offset-2 hover:text-fg" onclick={testRelay}>{$t('liveSession.testRelay')}</button>
          {:else if turnCheck === 'checking'}
            {$t('liveSession.testingRelay')}
          {:else}
            <span class={turnCheck.reachable ? 'text-success' : 'text-danger'}>{turnCheck.detail}</span>
          {/if}
        </span>
      </div>
    {/if}

    {#if session.error}
      <p class="text-xs text-danger" role="alert">{session.error}</p>
    {/if}

    <Button class="self-start" onclick={start} loading={isStarting} disabled={shareMode === 'selected' && selected.size === 0}>
      {$t('liveSession.createSession')}
    </Button>
  </div>
{:else}
  <div class="flex flex-col gap-5">
    <FormField label={$t('liveSession.sendLink')} for="{uid}-invite" controlWidth="full">
      <div class="flex gap-2">
        <Input id="{uid}-invite" readonly mono class="text-xs" value={session.inviteUrl ?? ''} />
        <Button icon variant="outline" onclick={() => copy(session.inviteUrl ?? '')} aria-label={$t('liveSession.copyLinkAria')}>
          {#if copied}<Check size={14} />{:else}<Copy size={14} />{/if}
        </Button>
      </div>
    </FormField>

    <FormField
      label={$t('liveSession.pasteCode')}
      for="{uid}-code"
      controlWidth="full"
      hint={$t('liveSession.pasteCodeHint')}
    >
      <Textarea id="{uid}-code" mono rows={4} bind:value={guestCode} placeholder={$t('liveSession.pasteCodePlaceholder')} />
    </FormField>
    <Button class="w-full" onclick={connect} disabled={!guestCode.trim()} loading={isStarting}>{$t('liveSession.connect')}</Button>

    {#if isConnected}
      <div class="flex flex-col items-start gap-2 rounded-md border border-success/40 bg-success-soft p-3 text-[13px] text-fg">
        <p>{$t('liveSession.connected')} · {people} 人</p>
        <p class="text-xs text-fg-3">{$t('liveSession.inviteNote')}</p>
        <Button size="sm" variant="outline" onclick={() => duckActions().inviteAnotherGuest()} disabled={isStarting}>
          <UserPlus size={13} />
          {$t('liveSession.inviteAnother')}
        </Button>
      </div>
    {/if}

    {#if session.error}
      <p class="text-xs text-danger" role="alert">{session.error}</p>
    {/if}
  </div>
{/if}
