const mongoose = require('mongoose');

const weeklyReportSchema = new mongoose.Schema({
  week: {
    type: String,
    required: true,
    comment: '周标识，如 2026-W14'
  },
  name: {
    type: String,
    required: true,
    comment: '姓名'
  },
  group: {
    type: String,
    default: '',
    comment: '课题组'
  },
  content: {
    type: Array,
    required: true,
    comment: '工作内容数组，每个元素包含 project, task 和 progress'
  },
  notes: {
    type: String,
    default: '',
    comment: '补充说明'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// 创建复合唯一索引，防止同一人同一周重复提交
weeklyReportSchema.index({ week: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyReport', weeklyReportSchema, 'weekly_reports');
