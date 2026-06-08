<template>
  <div class="view-page" @click="closeAnnotationEditors">
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

        <label>批注人：</label>
        <input
          v-model="annotationUser"
          class="annotation-user-input"
          placeholder="请输入姓名"
          @blur="saveAnnotationUser"
        />

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

      <div v-if="flashMessage" :class="['flash-message', flashMessage.type]">
        {{ flashMessage.text }}
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
              :key="item.itemId || index"
              class="task-item task-item-with-annotation"
              :class="{ 'annotation-open': isAnnotationOpen(report._id, item.itemId, index) }"
            >
              <button
                class="annotation-toggle"
                :class="{ active: isAnnotationOpen(report._id, item.itemId, index), 'has-annotations': item.annotations && item.annotations.length }"
                title="批注"
                @click.stop="toggleAnnotation(report._id, item.itemId, index)"
              >
                批
              </button>
              <div class="task-main">
                <div class="task-name">{{ index + 1 }}. {{ item.project || item.task }}</div>
                <div class="task-progress">
                  <div v-for="row in item.progress.split('\n')" :key="row">{{ row }}</div>
                </div>
              </div>
              <div v-if="item.annotations && item.annotations.length" class="annotation-summary-list">
                <div
                  v-for="annotation in item.annotations"
                  :key="annotation._id"
                  class="annotation-summary"
                  :class="{ expanded: isAnnotationDetailOpen(report._id, item.itemId, annotation.author, index) }"
                  @click="toggleAnnotationDetail(report._id, item.itemId, annotation.author, index)"
                >
                  <div class="annotation-summary-line">
                    <span class="annotation-author">{{ annotation.author }}：</span>{{ annotation.text }}
                  </div>
                  <div v-if="isAnnotationDetailOpen(report._id, item.itemId, annotation.author, index)" class="annotation-detail" @click.stop>
                    <div class="annotation-meta">
                      <span>{{ annotation.author }}</span>
                      <span>{{ formatAnnotationTime(annotation.updated_at) }}</span>
                    </div>
                    <textarea
                      v-model="annotationEditDrafts[annotationAuthorKey(report._id, item.itemId, annotation.author, index)]"
                      class="form-control annotation-textarea"
                      rows="3"
                    />
                    <div class="annotation-actions">
                      <button class="btn btn-danger annotation-save-btn" @click="deleteAnnotation(report, item, annotation, index)">删除</button>
                      <button
                        class="btn btn-primary annotation-save-btn"
                        @click="updateAnnotation(report, item, annotation, index)"
                        :disabled="savingAnnotations[annotationAuthorKey(report._id, item.itemId, annotation.author, index)]"
                      >
                        {{ savingAnnotations[annotationAuthorKey(report._id, item.itemId, annotation.author, index)] ? '保存中...' : '保存' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="isAnnotationOpen(report._id, item.itemId, index)" class="annotation-panel" @click.stop>
                <div class="annotation-title">新增批注</div>
                <textarea
                  v-model="annotationDrafts[annotationKey(report._id, item.itemId, index)]"
                  class="form-control annotation-textarea"
                  rows="3"
                  placeholder="输入你的批注"
                />
                <div class="annotation-actions">
                  <button
                    class="btn btn-primary annotation-save-btn"
                    @click="saveAnnotation(report, item, index)"
                    :disabled="savingAnnotations[annotationKey(report._id, item.itemId, index)]"
                  >
                    {{ savingAnnotations[annotationKey(report._id, item.itemId, index)] ? '保存中...' : '保存' }}
                  </button>
                </div>
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
              :key="item.itemId || index"
              class="person-progress-item task-item-with-annotation"
              :class="{ 'annotation-open': isAnnotationOpen(item.reportId, item.itemId, index) }"
            >
              <button
                class="annotation-toggle"
                :class="{ active: isAnnotationOpen(item.reportId, item.itemId, index), 'has-annotations': item.annotations && item.annotations.length }"
                title="批注"
                @click.stop="toggleAnnotation(item.reportId, item.itemId, index)"
              >
                批
              </button>
              <div class="task-main person-progress-main">
                <div class="person-name">{{ item.person }}：</div>
                <div class="person-progress">
                  <div v-for="row in item.progress.split('\n')" :key="row">{{ row }}</div>
                </div>
              </div>
              <div v-if="item.annotations && item.annotations.length" class="annotation-summary-list">
                <div
                  v-for="annotation in item.annotations"
                  :key="annotation._id"
                  class="annotation-summary"
                  :class="{ expanded: isAnnotationDetailOpen(item.reportId, item.itemId, annotation.author, index) }"
                  @click.stop="toggleAnnotationDetail(item.reportId, item.itemId, annotation.author, index)"
                >
                  <div class="annotation-summary-line">
                    <span class="annotation-author">{{ annotation.author }}：</span>{{ annotation.text }}
                  </div>
                  <div v-if="isAnnotationDetailOpen(item.reportId, item.itemId, annotation.author, index)" class="annotation-detail" @click.stop>
                    <div class="annotation-meta">
                      <span>{{ annotation.author }}</span>
                      <span>{{ formatAnnotationTime(annotation.updated_at) }}</span>
                    </div>
                    <textarea
                      v-model="annotationEditDrafts[annotationAuthorKey(item.reportId, item.itemId, annotation.author, index)]"
                      class="form-control annotation-textarea"
                      rows="3"
                    />
                    <div class="annotation-actions">
                      <button class="btn btn-danger annotation-save-btn" @click="deleteAnnotation(item.report, item, annotation, index)">删除</button>
                      <button
                        class="btn btn-primary annotation-save-btn"
                        @click="updateAnnotation(item.report, item, annotation, index)"
                        :disabled="savingAnnotations[annotationAuthorKey(item.reportId, item.itemId, annotation.author, index)]"
                      >
                        {{ savingAnnotations[annotationAuthorKey(item.reportId, item.itemId, annotation.author, index)] ? '保存中...' : '保存' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="isAnnotationOpen(item.reportId, item.itemId, index)" class="annotation-panel" @click.stop>
                <div class="annotation-title">新增批注</div>
                <textarea
                  v-model="annotationDrafts[annotationKey(item.reportId, item.itemId, index)]"
                  class="form-control annotation-textarea"
                  rows="3"
                  placeholder="输入你的批注"
                />
                <div class="annotation-actions">
                  <button
                    class="btn btn-primary annotation-save-btn"
                    @click="saveAnnotation(item.report, item, index)"
                    :disabled="savingAnnotations[annotationKey(item.reportId, item.itemId, index)]"
                  >
                    {{ savingAnnotations[annotationKey(item.reportId, item.itemId, index)] ? '保存中...' : '保存' }}
                  </button>
                </div>
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
import { getAllWeeks, getReportsByWeek, exportWeekUrl, saveReportItemAnnotation, deleteReportItemAnnotation } from '../api'

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
    const flashMessage = ref(null)
    let flashTimer = null

    const flash = (type, text) => {
      flashMessage.value = { type, text }
      if (flashTimer) clearTimeout(flashTimer)
      flashTimer = setTimeout(() => { flashMessage.value = null }, 2500)
    }
    const viewMode = ref('person') // 'person' 按人员 | 'task' 按任务
    const annotationUser = ref(localStorage.getItem('annotationUser') || localStorage.getItem('userName') || '')
    const annotationDrafts = ref({})
    const annotationEditDrafts = ref({})
    const savingAnnotations = ref({})
    const openedAnnotations = ref({})
    const openedAnnotationDetails = ref({})

    const annotationKey = (reportId, itemId, index = '') => `${reportId}:${itemId || `index-${index}`}`
    const annotationAuthorKey = (reportId, itemId, author, index = '') => `${annotationKey(reportId, itemId, index)}:${author}`

    const isAnnotationOpen = (reportId, itemId, index = '') => !!openedAnnotations.value[annotationKey(reportId, itemId, index)]

    const toggleAnnotation = (reportId, itemId, index = '') => {
      const key = annotationKey(reportId, itemId, index)
      openedAnnotations.value[key] = !openedAnnotations.value[key]
    }

    const closeAnnotationEditors = () => {
      openedAnnotations.value = {}
    }

    const isAnnotationDetailOpen = (reportId, itemId, author, index = '') => !!openedAnnotationDetails.value[annotationAuthorKey(reportId, itemId, author, index)]

    const toggleAnnotationDetail = (reportId, itemId, author, index = '') => {
      const key = annotationAuthorKey(reportId, itemId, author, index)
      openedAnnotationDetails.value[key] = !openedAnnotationDetails.value[key]
    }

    const initAnnotationDrafts = () => {
      const drafts = {}
      const editDrafts = {}
      reports.value.forEach(report => {
        ;(report.content || []).forEach((item, index) => {
          drafts[annotationKey(report._id, item.itemId, index)] = ''
          ;(item.annotations || []).forEach(existingAnnotation => {
            editDrafts[annotationAuthorKey(report._id, item.itemId, existingAnnotation.author, index)] = existingAnnotation.text
          })
        })
      })
      annotationDrafts.value = drafts
      annotationEditDrafts.value = editDrafts
    }

    const persistAnnotationUser = () => {
      const name = annotationUser.value.trim()
      if (name) {
        localStorage.setItem('annotationUser', name)
      }
    }

    const saveAnnotationUser = () => {
      persistAnnotationUser()
      initAnnotationDrafts()
    }

    const formatAnnotationTime = (time) => {
      if (!time) return ''
      return new Date(time).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const applyAnnotationResult = (report, item, annotation, author) => {
      const updateItem = (target) => {
        const others = (target.annotations || []).filter(existingAnnotation => existingAnnotation.author !== author)
        target.annotations = annotation ? [annotation, ...others] : others
      }
      updateItem(item)

      const reportItem = (report.content || []).find(contentItem => contentItem.itemId === item.itemId)
      if (reportItem && reportItem !== item) {
        updateItem(reportItem)
      }
    }

    const saveAnnotation = async (report, item, index = '') => {
      const author = annotationUser.value.trim()
      if (!author) {
        message.value = { type: 'message-error', text: '请输入批注人' }
        return
      }

      persistAnnotationUser()
      const key = annotationKey(report._id, item.itemId, index)
      savingAnnotations.value[key] = true

      try {
        const result = await saveReportItemAnnotation(report._id, item.itemId, {
          author,
          text: annotationDrafts.value[key] || ''
        })
        if (result.success) {
          applyAnnotationResult(report, item, result.data, author)
          annotationDrafts.value[key] = ''
          openedAnnotations.value[key] = false
          if (result.data) {
            annotationEditDrafts.value[annotationAuthorKey(report._id, item.itemId, author, index)] = result.data.text
          }
          flash('flash-success', result.message || '批注保存成功')
        } else {
          flash('flash-error', result.error || '批注保存失败')
        }
      } catch (e) {
        flash('flash-error', e.response?.data?.error || e.message || '网络错误')
      } finally {
        savingAnnotations.value[key] = false
      }
    }

    const updateAnnotation = async (report, item, annotation, index = '') => {
      const key = annotationAuthorKey(report._id, item.itemId, annotation.author, index)
      savingAnnotations.value[key] = true

      try {
        const result = await saveReportItemAnnotation(report._id, item.itemId, {
          author: annotation.author,
          text: annotationEditDrafts.value[key] || ''
        })
        if (result.success) {
          applyAnnotationResult(report, item, result.data, annotation.author)
          if (result.data) {
            annotationEditDrafts.value[key] = result.data.text
          }
          flash('flash-success', result.message || '批注保存成功')
        } else {
          flash('flash-error', result.error || '批注保存失败')
        }
      } catch (e) {
        flash('flash-error', e.response?.data?.error || e.message || '网络错误')
      } finally {
        savingAnnotations.value[key] = false
      }
    }

    const deleteAnnotation = async (report, item, annotation, index = '') => {
      try {
        const result = await deleteReportItemAnnotation(report._id, item.itemId, annotation.author)
        if (result.success) {
          applyAnnotationResult(report, item, null, annotation.author)
          openedAnnotationDetails.value[annotationAuthorKey(report._id, item.itemId, annotation.author, index)] = false
          flash('flash-success', result.message || '批注已删除')
        } else {
          flash('flash-error', result.error || '删除失败')
        }
      } catch (e) {
        flash('flash-error', e.response?.data?.error || e.message || '网络错误')
      }
    }

    // 按任务名称分组（忽略大小写）
    const groupedByTask = computed(() => {
      const result = {}
      const keyMap = {} // 存储小写key到原始显示名称的映射

      reports.value.forEach(report => {
        if (report.content && report.content.length > 0) {
          report.content.forEach(item => {
            const task = item.project || item.task
            const key = task.toLowerCase()
            if (!result[key]) {
              result[key] = []
              keyMap[key] = task
            }
            result[key].push({
              ...item,
              report,
              reportId: report._id,
              task: item.task,
              person: report.name,
              progress: item.progress
            })
          })
        }
      })

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
          initAnnotationDrafts()
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
      flashMessage,
      viewMode,
      groups,
      groupedByTask,
      annotationUser,
      annotationDrafts,
      annotationEditDrafts,
      savingAnnotations,
      annotationKey,
      annotationAuthorKey,
      isAnnotationOpen,
      toggleAnnotation,
      closeAnnotationEditors,
      isAnnotationDetailOpen,
      toggleAnnotationDetail,
      formatAnnotationTime,
      saveAnnotationUser,
      saveAnnotation,
      updateAnnotation,
      deleteAnnotation,
      formatWeekChinese,
      loadReports,
      exportWord
    }
  }
}
</script>
