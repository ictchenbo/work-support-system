<template>
  <div class="requirement-page">
    <div class="card">
      <!-- 新增需求表单 -->
      <div class="add-requirement-section">
        <input
          type="text"
          v-model="newRequirement.title"
          class="form-control"
          placeholder="请输入新需求，按回车添加"
          @keyup.enter="addRequirement"
        />
      </div>

      <!-- 待办列表 -->
      <div class="list-section pending-section">
        <h3>待办项 ({{ pendingRequirements.length }})</h3>
        <div v-if="pendingRequirements.length === 0" class="empty-state">
          暂无待办需求
        </div>
        <TransitionGroup name="list" class="requirement-list">
          <div
            v-for="req in pendingRequirements"
            :key="req._id"
            class="requirement-card list-item"
            @click="toggleStatus(req)"
          >
            <div class="requirement-header">
              <h4>{{ req.title }}</h4>
              <button
                class="btn btn-sm btn-danger delete-btn"
                @click.stop="confirmDelete(req)"
              >
                删除
              </button>
            </div>
            <div v-if="req.description" class="requirement-description">
              {{ req.description }}
            </div>
            <div class="requirement-time">
              更新时间: {{ formatTime(req.updated_at) }}
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- 已完成列表 -->
      <div class="list-section completed-section">
        <h3 class="completed-title">已完成 ({{ completedRequirements.length }})</h3>
        <div v-if="completedRequirements.length === 0" class="empty-state">
          暂无已完成需求
        </div>
        <TransitionGroup name="list" class="requirement-list">
          <div
            v-for="req in completedRequirements"
            :key="req._id"
            class="requirement-card completed-card list-item"
            @click="toggleStatus(req)"
          >
            <div class="requirement-header">
              <h4>{{ req.title }}</h4>
              <button
                class="btn btn-sm btn-danger delete-btn"
                @click.stop="confirmDelete(req)"
              >
                删除
              </button>
            </div>
            <div v-if="req.description" class="requirement-description">
              {{ req.description }}
            </div>
            <div class="requirement-time">
              更新时间: {{ formatTime(req.updated_at) }}
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="deletingRequirement" class="modal-overlay" @click="cancelDelete">
      <div class="modal modal-sm" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除需求"{{ deletingRequirement.title }}"吗？此操作不可恢复。</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelDelete">取消</button>
          <button class="btn btn-danger" @click="executeDelete" :disabled="loading">
            {{ loading ? '删除中...' : '删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import {
  getAllRequirements,
  createRequirement,
  toggleRequirementStatus,
  deleteRequirement
} from '../api'

export default {
  name: 'RequirementPage',
  setup() {
    const requirements = ref([])
    const loading = ref(false)
    const message = ref(null)
    const deletingRequirement = ref(null)

    // 从localStorage获取用户名，和周报保持一致
    const currentUser = ref(localStorage.getItem('userName') || '')

    const newRequirement = ref({
      title: '',
      description: ''
    })

    // 待办需求 - 按更新时间倒序
    const pendingRequirements = computed(() => {
      return requirements.value.filter(req => !req.completed)
    })

    // 已完成需求 - 按更新时间倒序
    const completedRequirements = computed(() => {
      return requirements.value.filter(req => req.completed)
    })

    // 加载需求列表
    const loadRequirements = async () => {
      if (!currentUser.value) {
        showMessage('请先在周报页面设置用户名', 'message-error')
        return
      }
      try {
        const result = await getAllRequirements(currentUser.value)
        if (result.success) {
          requirements.value = result.data
        }
      } catch (e) {
        console.error('加载需求列表失败', e)
        showMessage('加载需求列表失败', 'message-error')
      }
    }

    // 添加需求
    const addRequirement = async () => {
      if (!currentUser.value) {
        showMessage('请先在周报页面设置用户名', 'message-error')
        return
      }
      if (!newRequirement.value.title.trim()) {
        showMessage('请输入需求标题', 'message-error')
        return
      }

      loading.value = true
      try {
        const result = await createRequirement({
          user: currentUser.value,
          title: newRequirement.value.title,
          description: newRequirement.value.description
        })

        if (result.success) {
          showMessage('添加需求成功', 'message-success')
          newRequirement.value = { title: '', description: '' }
          await loadRequirements()
        } else {
          showMessage(result.error || '添加失败', 'message-error')
        }
      } catch (e) {
        showMessage(e.response?.data?.error || e.message || '网络错误', 'message-error')
      } finally {
        loading.value = false
      }
    }

    // 切换完成状态
    const toggleStatus = async (requirement) => {
      loading.value = true
      try {
        const result = await toggleRequirementStatus(requirement._id)
        if (result.success) {
          await loadRequirements()
        } else {
          showMessage(result.error || '状态更新失败', 'message-error')
        }
      } catch (e) {
        showMessage(e.response?.data?.error || e.message || '网络错误', 'message-error')
      } finally {
        loading.value = false
      }
    }

    // 确认删除
    const confirmDelete = (requirement) => {
      deletingRequirement.value = requirement
    }

    // 取消删除
    const cancelDelete = () => {
      deletingRequirement.value = null
    }

    // 执行删除
    const executeDelete = async () => {
      if (!deletingRequirement.value) return

      loading.value = true
      try {
        const result = await deleteRequirement(deletingRequirement.value._id)

        if (result.success) {
          showMessage('删除成功', 'message-success')
          deletingRequirement.value = null
          await loadRequirements()
        } else {
          showMessage(result.error || '删除失败', 'message-error')
        }
      } catch (e) {
        showMessage(e.response?.data?.error || e.message || '网络错误', 'message-error')
      } finally {
        loading.value = false
      }
    }

    // 格式化时间
    const formatTime = (timeStr) => {
      const date = new Date(timeStr)
      const now = new Date()
      const diff = now - date

      // 小于1分钟
      if (diff < 60000) {
        return '刚刚'
      }
      // 小于1小时
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      }
      // 今天
      if (date.toDateString() === now.toDateString()) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      }
      // 昨天
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      }
      // 其他日期
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }

    // 显示消息
    const showMessage = (text, type) => {
      message.value = { text, type }
      setTimeout(() => {
        message.value = null
      }, 3000)
    }

    onMounted(() => {
      loadRequirements()
    })

    return {
      requirements,
      loading,
      message,
      newRequirement,
      pendingRequirements,
      completedRequirements,
      deletingRequirement,
      addRequirement,
      toggleStatus,
      confirmDelete,
      cancelDelete,
      executeDelete,
      formatTime
    }
  }
}
</script>

<style scoped>
.add-requirement-section {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.list-section {
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.pending-section {
  background: #e3f2fd;
}

.completed-section {
  background: #e8f5e9;
}

.list-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.completed-title {
  color: #666;
  opacity: 0.7;
}

.requirement-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-item {
  margin: 0;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.requirement-card {
  background: white;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s, opacity 0.5s, transform 0.5s;
}

.requirement-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.completed-card {
  border-color: #c8e6c9;
  opacity: 0.8;
}

.completed-card h4 {
  text-decoration: line-through;
  color: #666;
}

.requirement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.requirement-header h4 {
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.requirement-description {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 0.5rem;
  white-space: pre-wrap;
}

.requirement-time {
  color: #999;
  font-size: 0.8rem;
}

.delete-btn {
  flex-shrink: 0;
}

.empty-state {
  color: #888;
  font-style: italic;
  text-align: center;
  padding: 2rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-sm {
  max-width: 400px;
}

.modal h3 {
  margin-top: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover {
  background: #d32f2f;
}
</style>
