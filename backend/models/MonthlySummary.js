const mongoose = require('mongoose');

const monthlySummarySchema = new mongoose.Schema({
  // 时间范围标识，格式 YYYY-MM 或自定义范围
  month: {
    type: String,
    required: true,
    comment: '月份标识，如 2026-04'
  },
  startWeek: {
    type: String,
    required: true,
    comment: '开始周，如 2026-W14'
  },
  endWeek: {
    type: String,
    required: true,
    comment: '结束周，如 2026-W17'
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
  // 汇聚的周报内容（文本格式，按项目汇总）
  workSummary: {
    type: String,
    default: '',
    comment: '工作内容汇总（文本格式，按项目汇总）'
  },
  // 额外字段用于绩效评价
  specialAchievements: {
    type: String,
    default: '',
    comment: '特别成果说明'
  },
  overtimeHours: {
    type: Number,
    default: 0,
    comment: '业绩加班时长（小时）'
  },
  leaveHours: {
    type: Number,
    default: 0,
    comment: '请假/调休时长（小时）'
  },
  onSiteDays: {
    type: Number,
    default: 0,
    comment: '驻场天数（天）'
  },
  otherNotes: {
    type: String,
    default: '',
    comment: '其他说明'
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

// 创建复合唯一索引，防止同一人同一时间范围重复创建
monthlySummarySchema.index({ month: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('MonthlySummary', monthlySummarySchema, 'monthly_summaries');
