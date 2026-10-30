<script lang="ts">
  import { t } from 'svelte-i18n'
  import { FileCheck, Plus, Trash2, Edit3 } from 'lucide-svelte'
  import PageHeader from '../common/PageHeader.svelte'
  import PageBody from '../common/PageBody.svelte'
  import Button from '../common/Button.svelte'
  import Badge from '../common/Badge.svelte'
  import EmptyState from '../common/EmptyState.svelte'

  // 规则列表（mock 数据，后续对接 API）
  let rules = $state([
    { id: 'r1', name: '订单表比对', fingerprint: 'a1b2c3', version: 1, publisher: 'admin', updatedAt: '2025-01-15' },
    { id: 'r2', name: '用户表比对', fingerprint: 'd4e5f6', version: 2, publisher: 'admin', updatedAt: '2025-02-20' },
  ])

  function deleteRule(id: string) {
    rules = rules.filter((r) => r.id !== id)
  }
</script>

<PageHeader title={$t('rules.title')} subtitle={$t('rules.subtitle')}>
  {#snippet actions()}
    <Button size="sm" onclick={() => {}}>
      <Plus size={13} />
      {$t('rules.newRule')}
    </Button>
  {/snippet}
</PageHeader>

<PageBody>
  {#if rules.length === 0}
    <EmptyState
      icon={FileCheck}
      title={$t('rules.emptyTitle')}
      description={$t('rules.emptyDesc')}
      primary={{ label: $t('rules.newRule'), onclick: () => {} }}
    />
  {:else}
    <div class="flex flex-col gap-2">
      {#each rules as rule (rule.id)}
        <div class="flex items-center gap-3 rounded-md border border-edge-subtle px-3 py-2.5 transition-colors hover:bg-hover">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-medium text-fg">{rule.name}</span>
              <Badge tone="brand">v{rule.version}</Badge>
            </div>
            <div class="mt-0.5 flex items-center gap-2 text-xs text-fg-3">
              <span>{$t('rules.fingerprint')}: {rule.fingerprint}</span>
              <span>·</span>
              <span>{$t('rules.publisher')}: {rule.publisher}</span>
              <span>·</span>
              <span>{$t('rules.updated')}: {rule.updatedAt}</span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <Button icon variant="ghost" size="xs" title={$t('common.edit')}>
              <Edit3 size={13} />
            </Button>
            <Button icon variant="ghost" size="xs" title={$t('common.delete')} onclick={() => deleteRule(rule.id)}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</PageBody>
