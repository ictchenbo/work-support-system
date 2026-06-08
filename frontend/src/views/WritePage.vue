<template>
  <div class="write-page">
    <div class="card">
      <h2>{{ currentWeek }} ({{ dateRange.start }} ~ {{ dateRange.end }})</h2>
      <br>

      <div v-if="message" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <div style="display: flex; gap: 1rem;">
        <div class="form-group" style="flex: 1;">
          <label for="name"><h3>姓名</h3></label>
          <input
            type="text"
            id="name"
            v-model="form.name"
            class="form-control"
            placeholder="请输入你的姓名"
            @blur="onNameBlur"
          />
        </div>

        <div class="form-group" style="flex: 1;">
          <label for="group"><h3>课题组</h3></label>
          <select
            id="group"
            v-model="form.group"
            class="form-control"
          >
            <option value="">请选择课题组</option>
            <option v-for="g in groups" :key="g" :value="g">
              {{ g }}
            </option>
          </select>
        </div>
      </div>

      <h3>本周工作</h3>
      <table>
        <thead>
          <tr>
            <th style="min-width: 150px;">项目</th>
            <th style="min-width: 150px;">任务（可不填）</th>
            <th>工作内容/进展</th>
            <th style="min-width: 30px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in form.content" :key="index">
            <td>
              <select
                v-model="item.project"
                class="form-control"
                @change="onProjectChange(index)"
              >
                <option value="">选择项目</option>
                <option v-for="project in projects" :key="project._id" :value="project.name">
                  {{ project.name }}
                </option>
              </select>
            </td>
            <td>
              <select
                v-model="item.task"
                class="form-control"
                :disabled="!item.project"
              >
                <option value="">选择任务</option>
                <option v-for="task in getTasksForProject(item.project)" :key="task" :value="task">
                  {{ task }}
                </option>
              </select>
            </td>
            <td>
              <textarea
                v-model="item.progress"
                class="form-control"
                rows="2"
                placeholder="输入工作进展"
                style="min-width:400px; max-width: 600px;min-height: 2rem;"
              />
            </td>
            <td>
              <button class="remove-btn" @click="removeItem(index)" title="删除">×</button>
            </td>
          </tr>
        </tbody>
      </table>

      <button class="btn btn-outline add-btn" @click="addItem">
        + 添加工作项
      </button>

      <br>

      <div class="form-group">
        <label for="notes"><h3>补充说明</h3></label>
        <textarea
          id="notes"
          v-model="form.notes"
          class="form-control"
          rows="4"
          placeholder="请输入补充说明（可选，如下周计划、问题反馈等）"
        />
      </div>

      <div><span style="font-weight: bold; color: red;">**注意不要涉密**</span></div>

      <button
        class="btn btn-primary submit-btn"
        @click="submitForm"
        :disabled="loading"
      >
        {{ loading ? '提交中...' : '提交周报' }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { getCurrentWeek, formatWeekChinese, getWeekDateRange } from '../utils/date'
import { getMyReport, saveReport, getAllProjectTasks } from '../api'

export default {
  name: 'WritePage',
  setup() {
    // 课题组列表在这里配置
    const groups = [
      '数据治理组',
      '关联引擎组',
      '业务系统组'
    ]

    const form = ref({
      name: '',
      group: '',
      notes: '',
      week: getCurrentWeek(),
      content: []
    })

    const createItemId = () => {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID()
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }

    const createEmptyItem = () => ({ itemId: createItemId(), project: '', task: '', progress: '' })

    form.value.content = [createEmptyItem()]

    const currentWeek = ref(getCurrentWeek())
    const weekDescription = ref(formatWeekChinese(currentWeek.value))
    const dateRange = ref(getWeekDateRange(currentWeek.value))
    const loading = ref(false)
    const message = ref(null)
    const projects = ref([])

    // 加载项目任务数据
    const loadProjects = async () => {
      try {
        const result = await getAllProjectTasks()
        if (result.success) {
          projects.value = result.data
        }
      } catch (e) {
        console.error('加载项目任务失败', e)
      }
    }

    // 获取项目的任务列表
    const getTasksForProject = (projectName) => {
      const project = projects.value.find(p => p.name === projectName)
      return project && project.tasks ? project.tasks : []
    }

    // 项目变化时清空任务选择
    const onProjectChange = (index) => {
      form.value.content[index].task = ''
    }

    // 添加工作项
    const addItem = () => {
      form.value.content.push(createEmptyItem())
    }

    // 删除工作项
    const removeItem = (index) => {
      if (form.value.content.length > 1) {
        form.value.content.splice(index, 1)
      }
    }

    // 自动保存草稿到localStorage
    const saveDraft = () => {
      const draft = {
        name: form.value.name,
        group: form.value.group,
        notes: form.value.notes,
        content: form.value.content,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(`weekly-draft-${currentWeek.value}`, JSON.stringify(draft))
    }

    // 加载草稿
    const loadDraft = () => {
      const tryLoadDraft = () => {
        const saved = localStorage.getItem(`weekly-draft-${currentWeek.value}`)
        if (saved) {
          try {
            const draft = JSON.parse(saved)
            if (draft.name) form.value.name = draft.name
            if (draft.group !== undefined) form.value.group = draft.group
            if (draft.notes !== undefined) form.value.notes = draft.notes
            if (draft.content && draft.content.length > 0) {
              // 兼容旧格式（只有 task 和 progress）
              form.value.content = draft.content.map(item => ({
                itemId: item.itemId || createItemId(),
                project: item.project || '',
                task: item.task || '',
                progress: item.progress || ''
              }))
            }
          } catch (e) {
            console.error('加载草稿失败', e)
          }
        }
      }

      // 尝试立即加载
      tryLoadDraft()

      // 如果项目还没加载完，延迟再试一次
      setTimeout(tryLoadDraft, 100)
    }

    // 从localStorage加载姓名和课题组
    const loadName = () => {
      const savedName = localStorage.getItem('userName')
      if (savedName) {
        form.value.name = savedName
      }
      const savedGroup = localStorage.getItem('userGroup')
      if (savedGroup) {
        form.value.group = savedGroup
      }
    }

    // 加载已存在的周报（编辑）
    const loadExistingReport = async () => {
      if (!form.value.name) return

      try {
        const result = await getMyReport(form.value.week, form.value.name)
        if (result.success && result.data) {
          // 已存在，可以编辑
          // 兼容旧格式
          form.value.content = result.data.content.map(item => ({
            itemId: item.itemId || createItemId(),
            project: item.project || '',
            task: item.task || '',
            progress: item.progress || ''
          }))
          if (result.data.group !== undefined) {
            form.value.group = result.data.group || ''
          }
          if (result.data.notes !== undefined) {
            form.value.notes = result.data.notes || ''
          }
          message.value = {
            type: 'message-success',
            text: '已加载你本周已提交的周报，修改后提交会自动更新'
          }
        }
      } catch (e) {
        console.error('加载已有周报失败', e)
      }
    }

    // 姓名输入框失去焦点时，自动加载已存在的周报
    const onNameBlur = async () => {
      if (form.value.name && form.value.name.trim()) {
        // 保存姓名到localStorage（即使后续清空缓存，这次记住了下次还能自动加载）
        localStorage.setItem('userName', form.value.name.trim())
        // 尝试加载已存在的周报
        await loadExistingReport()
      }
    }

    // 提交表单
    const submitForm = async () => {
      // 验证
      if (!form.value.name.trim()) {
        message.value = { type: 'message-error', text: '请输入姓名' }
        return
      }
      if (form.value.content.length === 0) {
        message.value = { type: 'message-error', text: '请至少添加一项工作内容' }
        return
      }
      const hasEmpty = form.value.content.some(
        item => !item.project.trim() || !item.progress.trim()
      )
      if (hasEmpty) {
        message.value = { type: 'message-error', text: '请填写完整所有工作项（项目、任务、进展）' }
        return
      }

      loading.value = true
      message.value = null

      try {
        // 保存姓名和课题组到localStorage
        localStorage.setItem('userName', form.value.name)
        if (form.value.group) {
          localStorage.setItem('userGroup', form.value.group)
        }
 
        // 提交到后端
        const result = await saveReport({
          week: form.value.week,
          name: form.value.name.trim(),
          group: form.value.group,
          notes: form.value.notes.trim(),
          content: form.value.content.map(item => ({
            itemId: item.itemId || createItemId(),
            project: item.project.trim(),
            task: item.task.trim(),
            progress: item.progress.trim()
          }))
        })

        if (result.success) {
          message.value = {
            type: 'message-success',
            text: result.message || '提交成功！'
          }
          // 清空草稿（提交成功了）
          // localStorage.removeItem(`weekly-draft-${currentWeek.value}`)
        } else {
          message.value = {
            type: 'message-error',
            text: result.error || '提交失败'
          }
        }
      } catch (e) {
        message.value = {
          type: 'message-error',
          text: e.response?.data?.error || e.message || '网络错误'
        }
      } finally {
        loading.value = false
      }
    }

    // 监听内容变化自动保存草稿
    let timeout = null
    const autoSave = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        saveDraft()
      }, 500)
    }

    onMounted(async () => {
      await loadProjects()
      loadName()
      loadDraft()

      // 如果加载了姓名，自动加载已有周报
      if (form.value.name) {
        await loadExistingReport()
      }

      // 监听变化自动保存
      document.addEventListener('input', autoSave)
    })

    return {
      form,
      currentWeek,
      weekDescription,
      dateRange,
      loading,
      message,
      projects,
      groups,
      getTasksForProject,
      onProjectChange,
      addItem,
      removeItem,
      onNameBlur,
      submitForm
    }
  }
}
</script>

<style scoped>
.form-control-static {
  padding: 0.5rem 0;
  color: #666;
}
</style>
