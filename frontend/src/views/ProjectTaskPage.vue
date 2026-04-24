<template>
  <div class="project-task-page">
    <div class="card">
      <div v-if="message" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <!-- 新增项目表单 -->
      <div class="add-project-section">
        <h3>新增项目</h3>
        <div class="form-group">
          <label>项目名称 <span style="font-weight: bold; color: red;">**注意不要涉密**</span></label>
          <input
            type="text"
            v-model="newProject.name"
            class="form-control"
            placeholder="请输入项目名称"
          />
        </div>
        <div class="form-group">
          <label>任务列表（每行一个任务）<span style="font-weight: bold; color: red;">**注意不要涉密**</span> </label>
          <textarea
            v-model="newProject.tasksText"
            class="form-control"
            rows="4"
            placeholder="请输入任务列表，每行一个任务"
          />
        </div>
        <button class="btn btn-primary" @click="addProject" :disabled="loading">
          {{ loading ? '添加中...' : '添加项目' }}
        </button>
      </div>

      <hr>

      <!-- 项目列表 -->
      <h3>项目列表</h3>
      <div v-if="projects.length === 0" class="empty-state">
        暂无项目，请添加
      </div>

      <div v-for="project in projects" :key="project._id" class="project-card">
        <div class="project-header">
          <h4>{{ project.name }}</h4>
          <div class="project-actions">
            <button class="btn btn-sm btn-secondary" @click="startEdit(project)">
              编辑
            </button>
            <button class="btn btn-sm btn-danger" @click="confirmDelete(project)">
              删除
            </button>
          </div>
        </div>

        <div class="task-list">
          <div v-if="!project.tasks || project.tasks.length === 0" class="empty-tasks">
            暂无任务
          </div>
          <div v-else class="task-tags">
            <span v-for="(task, idx) in project.tasks" :key="idx" class="task-tag">
              {{ task }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑模态框 -->
    <div v-if="editingProject" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h3>编辑项目</h3>
        <div class="form-group">
          <label>项目名称</label>
          <input
            type="text"
            v-model="editingProject.name"
            class="form-control"
            placeholder="请输入项目名称"
          />
        </div>
        <div class="form-group">
          <label>任务列表（每行一个任务）</label>
          <textarea
            v-model="editingProject.tasksText"
            class="form-control"
            rows="6"
            placeholder="请输入任务列表，每行一个任务"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveEdit" :disabled="loading">
            {{ loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="deletingProject" class="modal-overlay" @click="cancelDelete">
      <div class="modal modal-sm" @click.stop>
        <h3>确认删除</h3>
        <p>确定要删除项目"{{ deletingProject.name }}"吗？此操作不可恢复。</p>
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
import { ref, onMounted } from 'vue'
import { getAllProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask } from '../api'

export default {
  name: 'ProjectTaskPage',
  setup() {
    const projects = ref([])
    const loading = ref(false)
    const message = ref(null)

    const newProject = ref({
      name: '',
      tasksText: ''
    })

    const editingProject = ref(null)
    const deletingProject = ref(null)

    // 加载项目列表
    const loadProjects = async () => {
      try {
        const result = await getAllProjectTasks()
        if (result.success) {
          projects.value = result.data
        }
      } catch (e) {
        console.error('加载项目列表失败', e)
        showMessage('加载项目列表失败', 'message-error')
      }
    }

    // 添加项目
    const addProject = async () => {
      if (!newProject.value.name.trim()) {
        showMessage('请输入项目名称', 'message-error')
        return
      }

      const tasks = parseTasksText(newProject.value.tasksText)

      loading.value = true
      try {
        const result = await createProjectTask({
          name: newProject.value.name.trim(),
          tasks
        })

        if (result.success) {
          showMessage('添加项目成功', 'message-success')
          newProject.value = { name: '', tasksText: '' }
          await loadProjects()
        } else {
          showMessage(result.error || '添加项目失败', 'message-error')
        }
      } catch (e) {
        showMessage(e.response?.data?.error || e.message || '网络错误', 'message-error')
      } finally {
        loading.value = false
      }
    }

    // 解析任务文本（按行分割并过滤空行）
    const parseTasksText = (text) => {
      return text.split('\n').map(t => t.trim()).filter(t => t)
    }

    // 开始编辑
    const startEdit = (project) => {
      editingProject.value = {
        _id: project._id,
        name: project.name,
        tasksText: project.tasks ? project.tasks.join('\n') : ''
      }
    }

    // 保存编辑
    const saveEdit = async () => {
      if (!editingProject.value.name.trim()) {
        showMessage('请输入项目名称', 'message-error')
        return
      }

      const tasks = parseTasksText(editingProject.value.tasksText)

      loading.value = true
      try {
        const result = await updateProjectTask(editingProject.value._id, {
          name: editingProject.value.name.trim(),
          tasks
        })

        if (result.success) {
          showMessage('更新成功', 'message-success')
          editingProject.value = null
          await loadProjects()
        } else {
          showMessage(result.error || '更新失败', 'message-error')
        }
      } catch (e) {
        showMessage(e.response?.data?.error || e.message || '网络错误', 'message-error')
      } finally {
        loading.value = false
      }
    }

    // 关闭模态框
    const closeModal = () => {
      editingProject.value = null
    }

    // 确认删除
    const confirmDelete = (project) => {
      deletingProject.value = project
    }

    // 取消删除
    const cancelDelete = () => {
      deletingProject.value = null
    }

    // 执行删除
    const executeDelete = async () => {
      if (!deletingProject.value) return

      loading.value = true
      try {
        const result = await deleteProjectTask(deletingProject.value._id)

        if (result.success) {
          showMessage('删除成功', 'message-success')
          deletingProject.value = null
          await loadProjects()
        } else {
          showMessage(result.error || '删除失败', 'message-error')
        }
      } catch (e) {
        showMessage(e.response?.data?.error || e.message || '网络错误', 'message-error')
      } finally {
        loading.value = false
      }
    }

    // 显示消息
    const showMessage = (text, type) => {
      message.value = { text, type }
      setTimeout(() => {
        message.value = null
      }, 3000)
    }

    onMounted(() => {
      loadProjects()
    })

    return {
      projects,
      loading,
      message,
      newProject,
      editingProject,
      deletingProject,
      addProject,
      startEdit,
      saveEdit,
      closeModal,
      confirmDelete,
      cancelDelete,
      executeDelete
    }
  }
}
</script>

<style scoped>
.add-project-section {
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.add-project-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.project-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.project-header h4 {
  margin: 0;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
}

.task-list {
  margin-top: 0.5rem;
}

.task-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.task-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
}

.empty-state,
.empty-tasks {
  color: #999;
  font-style: italic;
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
