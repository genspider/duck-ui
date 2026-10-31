<script lang="ts">
  import { tr } from '../../../lib/i18n/translate'
  import Button from '../common/Button.svelte'
  import Input from '../common/Input.svelte'
  import FormField from '../common/FormField.svelte'
  import type { CsvImportOptions } from '@/lib/fileImporter/types'

  type OptionValue = string | boolean | number | undefined

  interface Props {
    /** Unique suffix for the field ids of this file. */
    idSuffix: string
    disabled: boolean
    csvOptions: CsvImportOptions
    onchange: (key: keyof CsvImportOptions, value: OptionValue) => void
  }

  let { idSuffix, disabled, csvOptions, onchange }: Props = $props()

  let showOptions = $state(false)

  const toggles: { key: 'header' | 'autoDetect' | 'ignoreErrors' | 'nullPadding'; label: string }[] = [
    { key: 'header', label: tr('csv.hasHeader') },
    { key: 'autoDetect', label: tr('csv.autoDetect') },
    { key: 'ignoreErrors', label: tr('csv.ignoreErrors') },
    { key: 'nullPadding', label: tr('csv.nullPadding') },
  ]

  const toCount = (raw: string): number | undefined => parseInt(raw, 10) || undefined
</script>

<div class="mt-3">
  <div class="flex items-center justify-between">
    <h4 class="text-xs font-medium text-fg-2">{tr('csv.importOptions')}</h4>
    <Button variant="ghost" size="xs" aria-expanded={showOptions} onclick={() => (showOptions = !showOptions)}>
      {showOptions ? tr('csv.hideOptions') : tr('csv.showOptions')}
    </Button>
  </div>

  {#if showOptions}
    <div class="mt-2 flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-2">
        {#each toggles as toggle (toggle.key)}
          <label class="ds-checkbox-label text-xs">
            <input
              type="checkbox"
              class="ds-checkbox ds-checkbox-sm"
              checked={csvOptions[toggle.key]}
              {disabled}
              onchange={(e) => onchange(toggle.key, e.currentTarget.checked)}
            />
            {toggle.label}
          </label>
        {/each}
      </div>

      <FormField label={tr('csv.delimiter')} for="delimiter-{idSuffix}" hint={tr('csv.delimiterHint')}>
        <Input
          id="delimiter-{idSuffix}"
          size="sm"
          value={csvOptions.delimiter}
          placeholder={tr('csv.delimiterPlaceholder')}
          {disabled}
          oninput={(e) => onchange('delimiter', e.currentTarget.value)}
        />
      </FormField>

      <div class="flex flex-col gap-3 border-t border-edge-subtle pt-3">
        <h5 class="text-xs font-medium text-fg-3">{tr('csv.advancedOptions')}</h5>

        <div class="grid grid-cols-2 gap-3">
          <FormField controlWidth="full" label={tr('csv.quoteChar')} for="quote-{idSuffix}">
            <Input
              id="quote-{idSuffix}"
              size="sm"
              value={csvOptions.quote ?? ''}
              placeholder={'" (default)'}
              {disabled}
              oninput={(e) => onchange('quote', e.currentTarget.value)}
            />
          </FormField>

          <FormField controlWidth="full" label={tr('csv.escapeChar')} for="escape-{idSuffix}">
            <Input
              id="escape-{idSuffix}"
              size="sm"
              value={csvOptions.escape ?? ''}
              placeholder={'" (default)'}
              {disabled}
              oninput={(e) => onchange('escape', e.currentTarget.value)}
            />
          </FormField>

          <FormField controlWidth="full" label={tr('csv.skipRows')} for="skip-{idSuffix}">
            <Input
              id="skip-{idSuffix}"
              size="sm"
              type="number"
              min={0}
              value={csvOptions.skip ?? ''}
              placeholder="0"
              {disabled}
              oninput={(e) => onchange('skip', toCount(e.currentTarget.value))}
            />
          </FormField>

          <FormField controlWidth="full" label={tr('csv.sampleSize')} for="sample-size-{idSuffix}">
            <Input
              id="sample-size-{idSuffix}"
              size="sm"
              type="number"
              min={1}
              value={csvOptions.sampleSize ?? ''}
              placeholder={tr('csv.samplePlaceholder')}
              {disabled}
              oninput={(e) => onchange('sampleSize', toCount(e.currentTarget.value))}
            />
          </FormField>
        </div>

        <FormField
          controlWidth="full"
          label={tr('csv.nullString')}
          for="null-str-{idSuffix}"
          hint={tr('csv.nullStringHint')}
        >
          <Input
            id="null-str-{idSuffix}"
            size="sm"
            value={csvOptions.nullStr ?? ''}
            placeholder={tr('csv.nullPlaceholder')}
            {disabled}
            oninput={(e) => onchange('nullStr', e.currentTarget.value)}
          />
        </FormField>

        <div class="grid grid-cols-2 gap-3">
          <FormField controlWidth="full" label={tr('csv.dateFormat')} for="date-format-{idSuffix}">
            <Input
              id="date-format-{idSuffix}"
              size="sm"
              value={csvOptions.dateFormat ?? ''}
              placeholder={tr('csv.datePlaceholder')}
              {disabled}
              oninput={(e) => onchange('dateFormat', e.currentTarget.value)}
            />
          </FormField>

          <FormField controlWidth="full" label={tr('csv.timestampFormat')} for="timestamp-format-{idSuffix}">
            <Input
              id="timestamp-format-{idSuffix}"
              size="sm"
              value={csvOptions.timestampFormat ?? ''}
              placeholder={tr('csv.timestampPlaceholder')}
              {disabled}
              oninput={(e) => onchange('timestampFormat', e.currentTarget.value)}
            />
          </FormField>
        </div>
      </div>
    </div>
  {/if}
</div>
