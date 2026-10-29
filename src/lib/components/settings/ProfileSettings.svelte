<script lang="ts">
  import { tr } from '../../../lib/i18n/translate'
  import { Trash2, UserPlus } from 'lucide-svelte'
  import type { Profile } from '@/store/types'
  import Button from '../common/Button.svelte'
  import ConfirmDialog from '../common/ConfirmDialog.svelte'
  import Modal from '../common/Modal.svelte'
  import SectionHeader from '../common/SectionHeader.svelte'
  import ProfileAvatar from '../profile/ProfileAvatar.svelte'
  import ProfileEditor, { type ProfileValues } from '../profile/ProfileEditor.svelte'
  import { duck, duckActions } from '../../stores/duck.svelte'
  import * as toast from '../../stores/toast.svelte'
  import PasswordDialog from './PasswordDialog.svelte'

  const currentProfile = $derived(duck((s) => s.currentProfile))
  const currentProfileId = $derived(duck((s) => s.currentProfileId))
  const profiles = $derived(duck((s) => s.profiles))
  const otherProfiles = $derived(profiles.filter((p) => p.id !== currentProfileId))

  let saving = $state(false)
  let creating = $state(false)
  let showCreate = $state(false)
  let showDeleteConfirm = $state(false)
  let deleting = $state(false)
  let switchTarget = $state<Profile | null>(null)
  let showPassword = $state(false)
  let pendingDeleteId = $state<string | null>(null)

  async function saveProfile(values: ProfileValues) {
    saving = true
    try {
      await duckActions().updateProfile({ name: values.name, avatarEmoji: values.avatarEmoji })
      toast.success(tr('profile.updated'))
    } catch {
      toast.error(tr('profile.updateFail'))
    } finally {
      saving = false
    }
  }

  async function createProfile(values: ProfileValues) {
    creating = true
    try {
      await duckActions().createProfile(values.name, values.password, values.avatarEmoji)
      showCreate = false
      toast.success(tr('profile.created', { name: values.name }))
    } catch {
      toast.error(tr('profile.createFail'))
    } finally {
      creating = false
    }
  }

  function switchProfile(profile: Profile) {
    if (profile.hasPassword) {
      switchTarget = profile
      showPassword = true
    } else {
      void duckActions().switchProfile(profile.id)
    }
  }

  async function deleteProfile() {
    showDeleteConfirm = false
    if (!currentProfileId || profiles.length <= 1) return
    const other = profiles.find((p) => p.id !== currentProfileId)
    if (!other) return

    // The app always needs an active profile, so deleting the current one
    // means landing on another first. A protected one asks for its password.
    if (other.hasPassword) {
      pendingDeleteId = currentProfileId
      switchTarget = other
      showPassword = true
      return
    }

    deleting = true
    try {
      const deletingId = currentProfileId
      const { switchProfile: doSwitch, deleteProfile: doDelete } = duckActions()
      await doSwitch(other.id)
      await doDelete(deletingId)
      toast.success(tr('profile.deleted'))
    } catch {
      toast.error(tr('profile.deleteFail'))
    } finally {
      deleting = false
    }
  }

  async function submitPassword(password: string) {
    if (!switchTarget) return
    const { switchProfile: doSwitch, deleteProfile: doDelete } = duckActions()
    try {
      if (pendingDeleteId) {
        deleting = true
        await doSwitch(switchTarget.id, password)
        await doDelete(pendingDeleteId)
        pendingDeleteId = null
        toast.success(tr('profile.deleted'))
        deleting = false
      } else {
        await doSwitch(switchTarget.id, password)
      }
      showPassword = false
    } catch {
      toast.error(pendingDeleteId ? tr('profile.deleteFail') : tr('profile.incorrectPassword'))
      pendingDeleteId = null
      deleting = false
    }
  }

  function closePassword() {
    showPassword = false
    pendingDeleteId = null
  }
</script>

<div class="flex flex-col gap-6">
  {#if currentProfile}
    <section>
      <SectionHeader title={tr('profile.yourProfile')} description={tr('profile.yourProfileDesc')} />
      <!-- The editor seeds its fields once, so a different profile needs a fresh one. -->
      {#key currentProfile.id}
        <ProfileEditor
          mode="edit"
          initialValues={{ name: currentProfile.name, avatarEmoji: currentProfile.avatarEmoji }}
          loading={saving}
          onsave={saveProfile}
        />
      {/key}
    </section>
  {/if}

  <section class="border-t border-edge-subtle pt-6">
    <SectionHeader title={tr('profile.profiles')} description={tr('profile.profilesDesc')}>
      {#snippet actions()}
        <Button size="sm" variant="outline" onclick={() => (showCreate = true)}>
          <UserPlus size={14} />
          Create New Profile
        </Button>
      {/snippet}
    </SectionHeader>

    {#if otherProfiles.length > 0}
      <ul class="flex flex-col gap-2">
        {#each otherProfiles as profile (profile.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-md border border-edge-subtle bg-surface p-2.5 text-left transition-colors hover:border-edge hover:bg-hover"
              onclick={() => switchProfile(profile)}
            >
              <ProfileAvatar avatarEmoji={profile.avatarEmoji} size="md" />
              <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{profile.name}</span>
              <span class="text-xs text-fg-3">Switch</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-xs text-fg-3">No other profiles yet.</p>
    {/if}
  </section>

  <section class="border-t border-edge-subtle pt-6">
    <h2 class="mb-3 text-[13px] font-semibold text-danger">Danger Zone</h2>
    <Button
      size="sm"
      variant="danger"
      disabled={profiles.length <= 1 || deleting}
      loading={deleting}
      onclick={() => (showDeleteConfirm = true)}
    >
      <Trash2 size={14} />
      Delete Profile
    </Button>
    {#if profiles.length <= 1}
      <p class="mt-2 text-xs text-fg-3">Cannot delete the only profile. Create another profile first.</p>
    {/if}
  </section>
</div>

<ConfirmDialog
  open={showDeleteConfirm}
  title={tr('profile.deleteTitle')}
  description={`This will permanently delete "${currentProfile?.name ?? ''}" and all associated data including saved connections, query history, and AI configurations. This action cannot be undone.`}
  confirmLabel="Delete"
  destructive
  onconfirm={deleteProfile}
  oncancel={() => (showDeleteConfirm = false)}
/>

<Modal open={showCreate} title={tr('profile.createTitle')} size="sm" onclose={() => (showCreate = false)}>
  <ProfileEditor mode="create" loading={creating} onsave={createProfile} oncancel={() => (showCreate = false)} />
</Modal>

{#if switchTarget}
  <PasswordDialog open={showPassword} profile={switchTarget} onsubmit={submitPassword} onclose={closePassword} />
{/if}
