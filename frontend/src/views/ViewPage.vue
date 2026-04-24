<template>
  <div class="view-page">
    <div class="card">
      <div class="week-selector">
        <label>选择周：</label>
        <select v-model="selectedWeek" @change="loadReports">
          <option v-for="week in weeks" :key="week" :value="week">
            {{ formatWeekChinese(week) }}
          </option>
        </select>
      </div>

      <div class="week-selector">
        <label>课题组：</label>
        <select v-model="selectedGroup" @change="loadReports">
          <option value="all">全部课题组</option>
          <option v-for="g in groups" :key="g" :value="g">
            {{ g }}
          </option>
        </select>

        <div class="view-mode-switch">
          <label>分组方式：</label>
          <button
            class="btn"
            :class="{ 'btn-primary': viewMode === 'person' }"
            @click="viewMode = 'person'"
          >
            按人员
          </button>
          <button
            class="btn"
            :class="{ 'btn-primary': viewMode === 'task' }"
            @click="viewMode = 'task'"
          >
            按项目
          </button>
        </div>

        <button
          class="btn btn-success"
          @click="exportWord"
          :disabled="!reports || reports.length === 0"
        >
          导出本周Word
        </button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-if="message" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <div v-if="!loading && reports && reports.length === 0">
        <p>本周还没有周报数据</p>
      </div>

      <!-- 按人员组织 -->
      <div v-if="viewMode === 'person'">
        <div v-for="report in reports" :key="report._id" class="report-item">
          <div class="report-name">{{ report.name }}</div>
          <div class="task-list">
            <div
              v-for="(item, index) in report.content"
              :key="index"
              class="task-item"
            >
              <div class="task-name">{{ index + 1 }}. {{item.project || item.task}}</div>
              <div class="task-progress">
                <div v-for="row in item.progress.split('\n')">{{row}}</div>
              </div>
            </div>
          </div>
          <div v-if="report.notes && report.notes.trim()" class="notes-section">
            <div class="notes-label">补充说明：</div>
            <div class="notes-content">{{ report.notes }}</div>
          </div>
        </div>
      </div>

      <!-- 按任务组织 -->
      <div v-if="viewMode === 'task'">
        <div v-for="(taskItems, taskName) in groupedByTask" :key="taskName" class="task-group-item">
          <div class="task-name-header">{{ taskName }}</div>
          <div class="person-list">
            <div
              v-for="(item, index) in taskItems"
              :key="index"
              class="person-progress-item"
            >
              <div class="person-name">{{ item.person }}：</div>
              <div class="person-progress">
                <div v-for="row in item.progress.split('\n')">{{row}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { getCurrentWeek, formatWeekChinese } from '../utils/date'
import { getAllWeeks, getReportsByWeek, exportWeekUrl } from '../api'

export default {
  name: 'ViewPage',
  setup() {
    // 课题组列表（与填写页面保持一致）
    const groups = [
      '数据治理组',
      '关联引擎组',
      '业务系统组'
    ]

    const weeks = ref([])
    const selectedWeek = ref(getCurrentWeek())
    const selectedGroup = ref('all')
    const reports = ref([])
    const loading = ref(false)
    const message = ref(null)
    const viewMode = ref('person') // 'person' 按人员 | 'task' 按任务

    // 按任务名称分组（忽略大小写）
    const groupedByTask = computed(() => {
      const result = {}
      const keyMap = {} // 存储小写key到原始显示名称的映射

      reports.value.forEach(report => {
        if (report.content && report.content.length > 0) {
          report.content.forEach(item => {
            const task = item.project || item.task;
            const key = task.toLowerCase()
            // const key = item.task.toLowerCase()
            if (!result[key]) {
              result[key] = []
              keyMap[key] = item.project // 保留第一个出现的原始大小写作为显示名称
            }
            result[key].push({
              task: item.task,
              person: report.name,
              progress: item.progress
            })
          })
        }
      })

      // 转换为以原始名称为key的对象保持显示一致
      const grouped = {}
      Object.entries(result).forEach(([key, items]) => {
        const displayName = keyMap[key]
        grouped[displayName] = items
      })

      return grouped
    })

    // 加载所有周列表
    const loadWeeks = async () => {
      try {
        const result = await getAllWeeks()
        if (result.success) {
          weeks.value = result.data
          // 如果没有数据，添加当前周
          if (weeks.value.length === 0) {
            weeks.value.push(selectedWeek.value)
          }
        }
      } catch (e) {
        console.error('加载周列表失败', e)
      }
    }

    // 加载选定周的报告
    const loadReports = async () => {
      loading.value = true
      message.value = null

      try {
        const result = await getReportsByWeek(selectedWeek.value, selectedGroup.value)
        if (result.success) {
          reports.value = result.data
        } else {
          message.value = {
            type: 'message-error',
            text: result.error || '加载失败'
          }
        }
      } catch (e) {
        message.value = {
          type: 'message-error',
          text: '网络错误'
        }
        console.error(e)
      } finally {
        loading.value = false
      }
    }

    // 导出Word
    const exportWord = () => {
      const url = exportWeekUrl(selectedWeek.value, selectedGroup.value)
      const link = document.createElement('a')
      link.href = url
      let filename = `weekly-report-${selectedWeek.value}`
      if (selectedGroup.value !== 'all') {
        filename += `-${selectedGroup.value}`
      }
      link.download = `${filename}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    onMounted(async () => {
      await loadWeeks()

      let val = localStorage.getItem('userGroup') || ''
      console.log('my group', val)
      selectedGroup.value = val

      await loadReports()
    })

    return {
      weeks,
      selectedWeek,
      selectedGroup,
      reports,
      loading,
      message,
      viewMode,
      groups,
      groupedByTask,
      formatWeekChinese,
      loadReports,
      exportWord
    }
  }
}
</script>
