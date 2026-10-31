<script lang="ts">
  import { untrack } from 'svelte'
  import { t } from 'svelte-i18n'
  import { Info, Plus, RefreshCw, Trash2 } from 'lucide-svelte'
  import type { QuackAttachmentState } from '@/store/types'
  import Badge from '../common/Badge.svelte'
  import Button from '../common/Button.svelte'
  import ConfirmDialog from '../common/ConfirmDialog.svelte'
  import FormField from '../common/FormField.svelte'
  import Input from '../common/Input.svelte'
  import Panel from '../common/Panel.svelte'
  import Sheet from '../common/Sheet.svelte'
  import { duck, duckActions } from '../../stores/duck.svelte'

  const FORM_ID = 'quack-attach-form'
  const SERVER_SNIPPET = `INSTALL quack;
LOAD quack;
CALL quack_serve('quack:localhost', token := 'your-token');`

  interface Props {
    /** The attach sheet is open. Bindable, so "Add connection" can open it. */
    attaching?: boolean
  }

  let { attaching = $bindable(false) }: Props = $props()

  const attachments = $derived(duck((s) => s.quackAttachments))
  const engineReady = $derived(duck((s) => s.isInitialized))

  let alias = $state('')
  let host = $state('')
  let token = $state('')
  let error = $state('')
  let busy = $state(false)
  let pending = $state<string | null>(null)
  let detachTarget = $state<QuackAttachmentState | null>(null)

  // Fresh fields each time the sheet opens, whoever opened it.
  $effect(() => {
    if (!attaching) return
    untrack(() => {
      alias = ''
      host = 'localhost:9494'
      token = ''
      error = ''
    })
  })

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (busy) return
    busy = true
    error = ''
    try {
      await duckActions().attachQuack({ alias, host, token })
      attaching = false
    } catch (err) {
      // Shown in the sheet so the values can be fixed rather than retyped.
      error = err instanceof Error ? err.message : String(err)
    } finally {
      busy = false
      token = attaching ? token : ''
    }
  }

  async function reconnect(name: string) {
    pending = name
    try {
      await duckActions().reconnectQuack(name)
    } finally {
      pending = null
    }
  }

  async function confirmDetach() {
    const target = detachTarget
    detachTarget = null
    if (!target) return
    pending = target.alias
    try {
      await duckActions().detachQuack(target.alias)
    } finally {
      pending = null
    }
  }
</script>

<Panel
  title={$t('quack.title')}
  description={$t('quack.description')}
  padding="none"
  class="mt-4"
>
  {#snippet actions()}
    <Button size="sm" variant="outline" disabled={!engineReady} onclick={() => (attaching = true)}>
      <Plus size={14} />
      {$t('quack.attach')}
    </Button>
  {/snippet}

  {#if attachments.length === 0}
    <p class="px-4 py-6 text-sm text-fg-3">
      {$t('quack.empty')}
    </p>
  {:else}
    <div class="ds-table-wrap pt-3">
      <table class="ds-table">
        <thead>
          <tr class="ds-table-head-row">
            <th class="ds-table-th">{$t('quack.table.database')}</th>
            <th class="ds-table-th">{$t('quack.table.host')}</th>
            <th class="ds-table-th">{$t('quack.table.status')}</th>
            <th class="ds-table-th-right">{$t('quack.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {#each attachments as attachment (attachment.alias)}
            <tr class="ds-table-row">
              <td class="ds-td-strong">{attachment.alias}</td>
              <td class="ds-td-mono">quack:{attachment.host}</td>
              <td class="ds-td">
                {#if attachment.status === 'attached'}
                  <Badge tone="success" dot>{$t('quack.attached')}</Badge>
                {:else}
                  <Badge tone="danger" dot title={attachment.error}>{$t('quack.failed')}</Badge>
                {/if}
              </td>
              <td class="ds-td">
                <div class="flex items-center justify-end gap-1.5">
                  <Button
                    icon
                    size="sm"
                    variant="ghost"
                    disabled={pending !== null}
                    aria-label={$t('quack.reconnectAria', { values: { name: attachment.alias } })}
                    onclick={() => reconnect(attachment.alias)}
                  >
                    <RefreshCw size={14} class={pending === attachment.alias ? 'animate-spin' : ''} />
                  </Button>
                  <Button
                    icon
                    size="sm"
                    variant="ghost"
                    disabled={pending !== null}
                    aria-label={$t('quack.detachAria', { values: { name: attachment.alias } })}
                    onclick={() => (detachTarget = attachment)}
                  >
                    <Trash2 size={14} class="text-danger" />
                  </Button>
                </div>
              </td>
            </tr>
            {#if attachment.status === 'failed' && attachment.error}
              <tr>
                <td colspan="4" class="px-4 pb-3 text-xs break-words text-danger">{attachment.error}</td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Panel>

<Sheet
  open={attaching}
  size="sm"
  title={$t('quack.attachTitle')}
  description={$t('quack.attachDesc')}
  onclose={() => (attaching = false)}
>
  <form id={FORM_ID} class="flex flex-col gap-4" novalidate onsubmit={submit}>
    <div class="flex gap-2 rounded-md bg-surface-2 p-3 text-xs text-fg-2">
      <Info size={14} class="mt-0.5 shrink-0 text-fg-3" />
      <div class="min-w-0 flex-1 space-y-1">
        <p>{$t('quack.serverHint')}</p>
        <pre class="overflow-x-auto rounded-sm bg-canvas px-2 py-1 font-mono text-[10px] leading-relaxed text-fg">{SERVER_SNIPPET}</pre>
        <p>{$t('quack.httpsNote')}</p>
      </div>
    </div>

    <FormField controlWidth="full" label={$t('quack.name')} for="quack-alias" hint={$t('quack.nameHint')}>
      <Input id="quack-alias" bind:value={alias} placeholder={$t('quack.name.placeholder')} autocomplete="off" spellcheck={false} />
    </FormField>

    <FormField controlWidth="full" label={$t('quack.host')} for="quack-host" hint={$t('quack.hostHint')}>
      <Input id="quack-host" bind:value={host} placeholder={$t('quack.host.placeholder')} autocomplete="off" spellcheck={false} />
    </FormField>

    <FormField controlWidth="full" label={$t('quack.token')} for="quack-token">
      <Input id="quack-token" type="password" bind:value={token} autocomplete="off" />
    </FormField>

    {#if error}
      <p role="alert" class="text-xs break-words text-danger">{error}</p>
    {/if}
  </form>

  {#snippet footer()}
    <Button size="sm" variant="outline" onclick={() => (attaching = false)} disabled={busy}>{$t('common.cancel')}</Button>
    <Button size="sm" type="submit" form={FORM_ID} disabled={busy}>{busy ? $t('quack.attaching') : $t('quack.attach')}</Button>
  {/snippet}
</Sheet>

<ConfirmDialog
  open={detachTarget !== null}
  title={$t('quack.detachTitle')}
  description={detachTarget
    ? $t('quack.detachDesc', { values: { name: detachTarget.alias } })
    : ''}
  confirmLabel={$t('quack.detach')}
  destructive
  onconfirm={confirmDetach}
  oncancel={() => (detachTarget = null)}
/>
