const mongoose = require('mongoose');

const reportAnnotationSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeeklyReport',
    required: true,
    index: true
  },
  itemId: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  text: {
    type: String,
    default: ''
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

reportAnnotationSchema.index({ reportId: 1, itemId: 1, author: 1 }, { unique: true });
reportAnnotationSchema.index({ reportId: 1, itemId: 1, updated_at: -1 });

module.exports = mongoose.model('ReportAnnotation', reportAnnotationSchema, 'report_annotations');
