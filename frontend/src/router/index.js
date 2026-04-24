import { createRouter, createWebHistory } from 'vue-router'
import WritePage from '../views/WritePage.vue'
import ViewPage from '../views/ViewPage.vue'
import ProjectTaskPage from '../views/ProjectTaskPage.vue'
import RequirementPage from '../views/RequirementPage.vue'
import MonthlySummaryPage from '../views/MonthlySummaryPage.vue'

const routes = [
  {
    path: '/',
    name: 'write',
    component: WritePage
  },
  {
    path: '/view',
    name: 'view',
    component: ViewPage
  },
  {
    path: '/project-tasks',
    name: 'project-tasks',
    component: ProjectTaskPage
  },
  {
    path: '/requirements',
    name: 'requirements',
    component: RequirementPage
  },
  {
    path: '/monthly-summary',
    name: 'monthly-summary',
    component: MonthlySummaryPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
