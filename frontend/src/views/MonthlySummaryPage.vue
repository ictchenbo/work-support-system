<template>
  <div class="monthly-summary-page">
    <div class="card">
      <h2>月度工作总结</h2>
      <br>

      <div v-if="message" :class="['message', message.type]">
        {{ message.text }}
      </div>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <div class="form-group">
          <label>选择月份：</label>
          <input
            type="month"
            v-model="selectedMonth"
            class="form-control"
            @change="onMonthChange"
          />
        </div>

        <div class="form-group">
          <label>课题组：</label>
          <select v-model="selectedGroup" class="form-control" @change="loadReports">
            <option value="all">全部课题组</option>
            <option v-for="g in groups" :key="g" :value="g">
              {{ g }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>人员：</label>
          <select v-model="selectedPerson" class="form-control" @change="loadPersonSummary">
            <option value="">选择人员</option>
            <option v-for="p in availablePersons" :key="p" :value="p">
              {{ p }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>时间范围：</label>
          <div class="date-range">
            <select v-model="startWeek" class="form-control" @change="loadReports">
              <option v-for="w in weeks" :key="w" :value="w">
                {{ formatWeekChinese(w) }}
              </option>
            </select>
            <span>至</span>
            <select v-model="endWeek" class="form-control" @change="loadReports">
              <option v-for="w in weeks" :key="w" :value="w">
                {{ formatWeekChinese(w) }}
              </option>
            </select>
          </div>
        </div>

        <button
          class="btn btn-primary"
          @click="loadReports"
          :disabled="loading"
        >
          {{ loading ? '加载中...' : '加载周报数据' }}
        </button>
      </div>

      <!-- 人员列表（查看模式） -->
      <div v-if="!selectedPerson && aggregatedReports.length > 0" class="person-list-section">
        <h3>人员列表</h3>
        <div class="person-cards">
          <div
            v-for="person in aggregatedReports"
            :key="person.name"
            class="person-card"
            @click="selectPerson(person.name)"
          >
            <div class="person-name">{{ person.name }}</div>
            <div class="person-group">{{ person.group || '未分组' }}</div>
            <div class="person-projects">
              {{ person.content.length }} 个项目
            </div>
          </div>
        </div>
      </div>

      <!-- 个人月度总结（编辑模式） -->
      <div v-if="selectedPerson" class="summary-editor">
        <div class="editor-header">
          <h3>{{ selectedPerson }} - 月度总结</h3>
          <button class="btn btn-outline" @click="clearPersonSelection">
            返回列表
          </button>
        </div>

        <!-- 汇聚的工作内容 -->
        <div class="aggregated-content">
          <div class="section-header">
            <h4>工作内容说明（基于周报内容自动汇总，内容可修改。未来将支持AI提炼）</h4>
            <button class="btn btn-outline small" @click="resetWorkSummary" title="重新根据周报内容汇总">
              🔄 重新汇总
            </button>
          </div>
          <textarea
            v-model="currentSummary.workSummary"
            class="form-control work-summary-editor"
            rows="20"
            placeholder="工作内容将按项目自动汇总到这里，您可以在此基础上进行编辑和整理..."
          />
        </div>

        <!-- 绩效字段 -->
        <div class="performance-fields">
          <h4>绩效评价字段</h4>

          <div class="form-group">
            <label>特别成果说明：</label>
            <textarea
              v-model="currentSummary.specialAchievements"
              class="form-control"
              rows="4"
              placeholder="请输入本月特别成果、重要贡献、突出表现等"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>业绩加班时长（小时）：</label>
              <input
                type="number"
                v-model.number="currentSummary.overtimeHours"
                class="form-control"
                min="0"
              />
            </div>

            <div class="form-group">
              <label>请假/调休时长（小时）：</label>
              <input
                type="number"
                v-model.number="currentSummary.leaveHours"
                class="form-control"
                min="0"
              />
            </div>

            <div class="form-group">
              <label>驻场天数（天）：</label>
              <input
                type="number"
                v-model.number="currentSummary.onSiteDays"
                class="form-control"
                min="0"
              />
            </div>
          </div>

          <div class="form-group">
            <label>其他说明：</label>
            <textarea
              v-model="currentSummary.otherNotes"
              class="form-control"
              rows="3"
              placeholder="其他需要说明的事项"
            />
          </div>
        </div>

        <button
          class="btn btn-primary submit-btn"
          @click="saveSummary"
          :disabled="saving"
        >
          {{ saving ? '保存中...' : '保存月度总结' }}
        </button>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && aggregatedReports.length === 0 && !selectedPerson" class="empty-state">
        <p>该时间范围内没有周报数据</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { formatWeekChinese } from '../utils/date'
import {
  getAllWeeks,
  getReportsByRange,
  getMonthlySummary,
  saveMonthlySummary
} from '../api'

export default {
  name: 'MonthlySummaryPage',
  setup() {
    const groups = [
      '数据治理组',
      '关联引擎组',
      '业务系统组'
    ]

    const weeks = ref([])
    const selectedMonth = ref('')
    const selectedGroup = ref('all')
    const selectedPerson = ref('')
    const startWeek = ref('')
    const endWeek = ref('')
    const aggregatedReports = ref([])
    const loading = ref(false)
    const saving = ref(false)
    const message = ref(null)

    // 当前正在编辑的月度总结
    const currentSummary = ref({
      workSummary: '',
      specialAchievements: '',
      overtimeHours: 0,
      leaveHours: 0,
      onSiteDays: 0,
      otherNotes: ''
    })

    // 获取可选人员列表
    const availablePersons = computed(() => {
      return aggregatedReports.value.map(r => r.name).sort()
    })

    // 月份变化时，自动设置周范围
    const onMonthChange = () => {
      if (!selectedMonth.value) return

      const [year, month] = selectedMonth.value.split('-').map(Number)
      const firstWeek = getFirstWeekOfMonth(year, month)
      const lastWeek = getLastWeekOfMonth(year, month)

      // 查找最接近的周
      const firstMatch = weeks.value.find(w => w >= firstWeek) || weeks.value[0]
      const lastMatch = weeks.value.find(w => w >= lastWeek) || firstMatch

      startWeek.value = firstMatch
      endWeek.value = lastMatch

      loadReports()
    }

    // 获取某月的第一周和最后周标识
    const getFirstWeekOfMonth = (year, month) => {
      const date = new Date(year, month - 1, 1)
      return getWeekIdentifier(date)
    }

    const getLastWeekOfMonth = (year, month) => {
      const date = new Date(year, month, 0)
      return getWeekIdentifier(date)
    }

    const getWeekIdentifier = (date) => {
      const year = date.getFullYear()
      const firstDayOfYear = new Date(year, 0, 1)
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      return `${year}-W${String(weekNumber).padStart(2, '0')}`
    }

    // 加载所有周列表
    const loadWeeks = async () => {
      try {
        const result = await getAllWeeks()
        if (result.success) {
          weeks.value = result.data.sort()
          // 设置默认时间范围（最近4周）
          if (weeks.value.length > 0) {
            endWeek.value = weeks.value[weeks.value.length - 1]
            const startIndex = Math.max(0, weeks.value.length - 4)
            startWeek.value = weeks.value[startIndex]
          }
          // 设置默认月份为当前月
          const now = new Date()
          selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        }
      } catch (e) {
        console.error('加载周列表失败', e)
      }
    }

    // 加载指定时间范围的周报
    const loadReports = async () => {
      if (!startWeek.value || !endWeek.value) return

      loading.value = true
      message.value = null

      try {
        const result = await getReportsByRange(
          startWeek.value,
          endWeek.value,
          selectedGroup.value
        )
        if (result.success) {
          aggregatedReports.value = result.data
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

    // 选择人员，加载其月度总结
    const selectPerson = async (name) => {
      selectedPerson.value = name
      await loadPersonSummary()
    }

    // 从周报数据汇总工作内容
    const aggregateWorkSummary = async () => {
      if (!selectedPerson.value) return ''

      const rangeResult = await getReportsByRange(
        startWeek.value,
        endWeek.value,
        selectedGroup.value,
        selectedPerson.value
      )

      if (rangeResult.success && rangeResult.data.length > 0) {
        const personData = rangeResult.data[0]
        const summaryLines = []
        personData.content.forEach((project, pIndex) => {
          summaryLines.push(`【${project.project}】`)
          project.tasks.forEach(task => {
            if (task.task) {
              summaryLines.push(`■ ${task.task}：`)
            }
            task.progresses.forEach(progress => {
              progress.progress.split('\n').forEach(line =>{
                summaryLines.push(`  • ${line}`)
              })
            })
          })
          if (pIndex < personData.content.length - 1) {
            summaryLines.push('')
          }
        })
        return summaryLines.join('\n')
      }
      return ''
    }

    // 重置工作内容汇总（重新从周报汇总）
    const resetWorkSummary = async () => {
      loading.value = true
      message.value = null
      try {
        currentSummary.value.workSummary = await aggregateWorkSummary()
        message.value = {
          type: 'message-success',
          text: '已重新从周报汇总工作内容'
        }
      } catch (e) {
        message.value = {
          type: 'message-error',
          text: '汇总失败'
        }
        console.error(e)
      } finally {
        loading.value = false
      }
    }

    // 加载人员的月度总结
    const loadPersonSummary = async () => {
      if (!selectedPerson.value || !selectedMonth.value) return

      loading.value = true
      message.value = null

      try {
        // 1. 先尝试获取已保存的月度总结
        const summaryResult = await getMonthlySummary(selectedMonth.value, selectedPerson.value)

        if (summaryResult.success && summaryResult.data) {
          // 有已保存的总结，直接加载
          const saved = summaryResult.data
          currentSummary.value = {
            workSummary: saved.workSummary || '',
            specialAchievements: saved.specialAchievements || '',
            overtimeHours: saved.overtimeHours || 0,
            leaveHours: saved.leaveHours || 0,
            onSiteDays: saved.onSiteDays || 0,
            otherNotes: saved.otherNotes || ''
          }
          message.value = {
            type: 'message-success',
            text: '已加载已保存的月度总结，点击"重新汇总"可从周报重新生成'
          }
        } else {
          // 2. 没有保存的总结，从周报数据汇总
          currentSummary.value.workSummary = await aggregateWorkSummary()
          message.value = {
            type: 'message-success',
            text: '已从周报内容自动汇总工作内容'
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

    const clearPersonSelection = () => {
      selectedPerson.value = ''
      currentSummary.value = {
        workSummary: '',
        specialAchievements: '',
        overtimeHours: 0,
        leaveHours: 0,
        onSiteDays: 0,
        otherNotes: ''
      }
    }

    // 保存月度总结
    const saveSummary = async () => {
      if (!selectedPerson.value || !selectedMonth.value) return

      saving.value = true
      message.value = null

      try {
        const personData = aggregatedReports.value.find(r => r.name === selectedPerson.value)
        const group = personData ? personData.group : ''

        const result = await saveMonthlySummary({
          month: selectedMonth.value,
          startWeek: startWeek.value,
          endWeek: endWeek.value,
          name: selectedPerson.value,
          group,
          ...currentSummary.value
        })

        if (result.success) {
          message.value = {
            type: 'message-success',
            text: result.message || '保存成功！'
          }
        } else {
          message.value = {
            type: 'message-error',
            text: result.error || '保存失败'
          }
        }
      } catch (e) {
        message.value = {
          type: 'message-error',
          text: e.response?.data?.error || e.message || '网络错误'
        }
      } finally {
        saving.value = false
      }
    }

    onMounted(async () => {
      await loadWeeks()

      // 从localStorage加载课题组和姓名
      const savedGroup = localStorage.getItem('userGroup')
      if (savedGroup) {
        selectedGroup.value = savedGroup
      }
      const savedName = localStorage.getItem('userName')
      if (savedName) {
        selectedPerson.value = savedName
      }

      await loadReports()

      // 如果有默认姓名，自动加载其总结
      if (selectedPerson.value) {
        await loadPersonSummary()
      }
    })

    return {
      groups,
      weeks,
      selectedMonth,
      selectedGroup,
      selectedPerson,
      startWeek,
      endWeek,
      aggregatedReports,
      availablePersons,
      currentSummary,
      loading,
      saving,
      message,
      formatWeekChinese,
      onMonthChange,
      loadReports,
      selectPerson,
      loadPersonSummary,
      clearPersonSelection,
      resetWorkSummary,
      saveSummary
    }
  }
}
</script>

<style scoped>
.filter-section {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.filter-section .form-group {
  margin-bottom: 0;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range span {
  padding: 0 0.25rem;
}

.person-list-section h3 {
  margin-bottom: 1rem;
  color: #333;
}

.person-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.person-card {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.person-card:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.person-name {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.person-group {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.person-projects {
  color: #888;
  font-size: 0.85rem;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.editor-header h3 {
  margin: 0;
}

.aggregated-content h4 {
  margin: 0;
  color: #555;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn.small {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.work-summary-editor {
  font-family: 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  background: #fefefe;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
  resize: vertical;
}

.performance-fields {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e0e0e0;
}

.performance-fields h4 {
  margin-bottom: 1.5rem;
  color: #555;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.submit-btn {
  margin-top: 2rem;
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #888;
}
</style>
