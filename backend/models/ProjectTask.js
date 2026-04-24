const mongoose = require('mongoose');

const projectTaskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    comment: '项目名称'
  },
  tasks: {
    type: [String],
    required: true,
    default: [],
    comment: '该项目的任务列表'
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

// 项目名称唯一索引
projectTaskSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('ProjectTask', projectTaskSchema, 'project_tasks');
