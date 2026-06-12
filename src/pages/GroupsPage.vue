<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NSpin, NEmpty, NModal, NForm, NFormItem, useMessage } from 'naive-ui'
import { useGroupsStore } from '@/stores/groups'

const router = useRouter()
const groupsStore = useGroupsStore()
const message = useMessage()
const showCreateModal = ref(false)
const newGroupName = ref('')
const newGroupDesc = ref('')

onMounted(() => { groupsStore.fetchGroups() })

async function createGroup() {
  if (!newGroupName.value.trim()) {
    message.warning('Vui lòng nhập tên nhóm')
    return
  }
  try {
    await groupsStore.createGroup({ name: newGroupName.value, description: newGroupDesc.value })
    message.success('Tạo nhóm thành công!')
    showCreateModal.value = false
    newGroupName.value = ''
    newGroupDesc.value = ''
  } catch (err: any) {
    message.error(err.response?.data?.error?.message || 'Tạo nhóm thất bại')
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="ef-page-title">Nhóm chi tiêu</h1>
      <n-button type="primary" size="small" @click="showCreateModal = true">+ Tạo nhóm</n-button>
    </div>

    <n-spin :show="groupsStore.loading">
      <n-empty v-if="groupsStore.groups.length === 0" description="Bạn chưa tham gia nhóm nào" />
      <div v-else class="groups-grid">
        <div v-for="group in groupsStore.groups" :key="group.id" class="group-card ef-card" @click="router.push(`/groups/${group.id}`)">
          <div class="group-card__avatar">{{ group.name?.charAt(0)?.toUpperCase() }}</div>
          <div class="group-card__info">
            <div class="group-card__name">{{ group.name }}</div>
            <div class="group-card__desc">{{ group.description || 'Nhóm chi tiêu chung' }}</div>
          </div>
          <div class="group-card__arrow">→</div>
        </div>
      </div>
    </n-spin>

    <n-modal v-model:show="showCreateModal" preset="dialog" title="Tạo nhóm mới" :show-icon="false">
      <n-form @submit.prevent="createGroup">
        <n-form-item label="Tên nhóm">
          <n-input v-model:value="newGroupName" placeholder="VD: Roommate, Đi du lịch..." />
        </n-form-item>
        <n-form-item label="Mô tả">
          <n-input v-model:value="newGroupDesc" type="textarea" placeholder="Mô tả ngắn..." />
        </n-form-item>
        <n-button type="primary" block attr-type="submit">Tạo nhóm</n-button>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; }
.groups-grid { display: flex; flex-direction: column; gap: 8px; }
.group-card { display: flex; align-items: center; gap: 14px; padding: 16px; cursor: pointer; }
.group-card__avatar {
  width: 44px; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, var(--ef-primary), #8B5CF6);
  color: white; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.1rem; flex-shrink: 0;
}
.group-card__info { flex: 1; min-width: 0; }
.group-card__name { font-weight: 600; font-size: 0.95rem; }
.group-card__desc { font-size: 0.8rem; color: var(--ef-text-tertiary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.group-card__arrow { color: var(--ef-text-tertiary); font-size: 1.2rem; }
</style>
