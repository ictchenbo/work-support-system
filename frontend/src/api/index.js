import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 获取指定周的所有周报，支持按课题组筛选
export async function getReportsByWeek(week, group = null) {
  let url = `/reports/${week}`
  if (group && group !== 'all') {
    url += `?group=${encodeURIComponent(group)}`
  }
  const response = await api.get(url)
  return response.data
}

// 获取所有周列表
export async function getAllWeeks() {
  const response = await api.get('/reports')
  return response.data
}

// 获取用户本周的周报（用于编辑）
export async function getMyReport(week, name) {
  const response = await api.get(`/reports/${week}/${encodeURIComponent(name)}`)
  return response.data
}

// 创建或更新周报
export async function saveReport(data) {
  const response = await api.post('/reports', data)
  return response.data
}

// 更新周报
export async function updateReport(id, content) {
  const response = await api.put(`/reports/${id}`, { content })
  return response.data
}

// 导出Word
export function exportWeekUrl(week, group = null) {
  let url = `/api/reports/export/${week}`
  if (group && group !== 'all') {
    url += `?group=${encodeURIComponent(group)}`
  }
  return url
}

// 获取所有项目任务
export async function getAllProjectTasks() {
  const response = await api.get('/project-tasks')
  return response.data
}

// 获取单个项目任务
export async function getProjectTask(id) {
  const response = await api.get(`/project-tasks/${id}`)
  return response.data
}

// 创建项目任务
export async function createProjectTask(data) {
  const response = await api.post('/project-tasks', data)
  return response.data
}

// 更新项目任务
export async function updateProjectTask(id, data) {
  const response = await api.put(`/project-tasks/${id}`, data)
  return response.data
}

// 删除项目任务
export async function deleteProjectTask(id) {
  const response = await api.delete(`/project-tasks/${id}`)
  return response.data
}

// === 需求管理 API ===
// 获取指定用户的所有需求
export async function getAllRequirements(user) {
  const response = await api.get('/requirements', { params: { user } })
  return response.data
}

// 创建需求
export async function createRequirement(data) {
  const response = await api.post('/requirements', data)
  return response.data
}

// 切换需求完成状态
export async function toggleRequirementStatus(id) {
  const response = await api.put(`/requirements/${id}/toggle`)
  return response.data
}

// 更新需求
export async function updateRequirement(id, data) {
  const response = await api.put(`/requirements/${id}`, data)
  return response.data
}

// 删除需求
export async function deleteRequirement(id) {
  const response = await api.delete(`/requirements/${id}`)
  return response.data
}

// === 月度总结 API ===
// 获取指定时间范围内的周报（用于汇聚）
export async function getReportsByRange(startWeek, endWeek, group = null, name = null) {
  const params = { startWeek, endWeek }
  if (group && group !== 'all') params.group = group
  if (name) params.name = name
  const response = await api.get('/monthly-summaries/reports-range', { params })
  return response.data
}

// 获取某人的月度总结
export async function getMonthlySummary(month, name) {
  const response = await api.get(`/monthly-summaries/${month}/${encodeURIComponent(name)}`)
  return response.data
}

// 获取指定月份的所有月度总结
export async function getMonthlySummariesByMonth(month, group = null) {
  const params = {}
  if (group && group !== 'all') params.group = group
  const response = await api.get(`/monthly-summaries/${month}`, { params })
  return response.data
}

// 创建或更新月度总结
export async function saveMonthlySummary(data) {
  const response = await api.post('/monthly-summaries', data)
  return response.data
}

export default api
