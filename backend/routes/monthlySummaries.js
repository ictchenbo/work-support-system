const express = require('express');
const router = express.Router();
const WeeklyReport = require('../models/WeeklyReport');
const MonthlySummary = require('../models/MonthlySummary');

// 获取指定时间范围内的周报（用于汇聚）
router.get('/reports-range', async (req, res) => {
  try {
    const { startWeek, endWeek, group, name } = req.query;

    if (!startWeek || !endWeek) {
      return res.status(400).json({ success: false, error: '缺少时间范围' });
    }

    let query = {
      week: { $gte: startWeek, $lte: endWeek }
    };

    if (group && group !== 'all') {
      query.group = group;
    }

    if (name) {
      query.name = name;
    }

    const reports = await WeeklyReport.find(query).sort({ week: 1, name: 1 });

    // 按人员和项目汇聚内容
    const aggregated = {};

    reports.forEach(report => {
      if (!aggregated[report.name]) {
        aggregated[report.name] = {
          name: report.name,
          group: report.group,
          projects: {}
        };
      }

      if (report.content && report.content.length > 0) {
        report.content.forEach(item => {
          const projectName = item.project || '其他';
          const taskName = item.task || '';

          if (!aggregated[report.name].projects[projectName]) {
            aggregated[report.name].projects[projectName] = {};
          }

          if (!aggregated[report.name].projects[projectName][taskName]) {
            aggregated[report.name].projects[projectName][taskName] = [];
          }

          aggregated[report.name].projects[projectName][taskName].push({
            week: report.week,
            progress: item.progress
          });
        });
      }
    });

    // 转换为数组格式
    const result = Object.values(aggregated).map(person => ({
      name: person.name,
      group: person.group,
      content: Object.entries(person.projects).map(([project, tasks]) => ({
        project,
        tasks: Object.entries(tasks).map(([task, progresses]) => ({
          task,
          progresses
        }))
      }))
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取某人的月度总结
router.get('/:month/:name', async (req, res) => {
  try {
    const { month, name } = req.params;
    const summary = await MonthlySummary.findOne({ month, name });
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取指定月份的所有月度总结
router.get('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const { group } = req.query;

    let query = { month };
    if (group && group !== 'all') {
      query.group = group;
    }

    const summaries = await MonthlySummary.find(query).sort({ name: 1 });
    res.json({ success: true, data: summaries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建或更新月度总结
router.post('/', async (req, res) => {
  try {
    const {
      month,
      startWeek,
      endWeek,
      name,
      group,
      workSummary,
      specialAchievements,
      overtimeHours,
      leaveHours,
      onSiteDays,
      otherNotes
    } = req.body;

    if (!month || !startWeek || !endWeek || !name) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const existing = await MonthlySummary.findOne({ month, name });

    if (existing) {
      existing.startWeek = startWeek;
      existing.endWeek = endWeek;
      existing.group = group || existing.group;
      if (workSummary !== undefined) {
        existing.workSummary = workSummary;
      }
      if (specialAchievements !== undefined) {
        existing.specialAchievements = specialAchievements;
      }
      if (overtimeHours !== undefined) {
        existing.overtimeHours = overtimeHours;
      }
      if (leaveHours !== undefined) {
        existing.leaveHours = leaveHours;
      }
      if (onSiteDays !== undefined) {
        existing.onSiteDays = onSiteDays;
      }
      if (otherNotes !== undefined) {
        existing.otherNotes = otherNotes;
      }
      existing.updated_at = new Date();
      await existing.save();
      res.json({ success: true, data: existing, message: '更新成功' });
    } else {
      const summary = new MonthlySummary({
        month,
        startWeek,
        endWeek,
        name,
        group: group || '',
        workSummary: workSummary || '',
        specialAchievements: specialAchievements || '',
        overtimeHours: overtimeHours || 0,
        leaveHours: leaveHours || 0,
        onSiteDays: onSiteDays || 0,
        otherNotes: otherNotes || ''
      });
      await summary.save();
      res.json({ success: true, data: summary, message: '创建成功' });
    }
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, error: '该月份总结已存在' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
