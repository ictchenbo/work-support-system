const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    comment: '用户名'
  },
  title: {
    type: String,
    required: true,
    comment: '需求标题'
  },
  description: {
    type: String,
    default: '',
    comment: '需求描述'
  },
  completed: {
    type: Boolean,
    default: false,
    comment: '是否已完成'
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

// 复合索引：按用户 + 更新时间排序
requirementSchema.index({ user: 1, updated_at: -1 });

module.exports = mongoose.model('Requirement', requirementSchema, 'requirements');
