const express = require('express');
const router = express.Router();
const WeeklyReport = require('../models/WeeklyReport');
const { Document, Paragraph, TextRun, HeadingLevel, Packer } = require('docx');

// 导出本周为Word文档 - 必须放在参数路由之前！
router.get('/export/:week', async (req, res) => {
  try {
    const week = req.params.week;
    const group = req.query.group;
    let query = { week };
    if (group && group !== 'all') {
      query.group = group;
    }
    const reports = await WeeklyReport.find(query).sort({ name: 1 });

    console.log(`Exporting ${week}, group=${group}, found ${reports.length} reports`);

    if (reports.length === 0) {
      return res.status(404).json({ success: false, error: '本周没有周报数据' });
    }

    // 解析年份和周数
    const [year, w] = week.split('-W');
    const weekNum = parseInt(w);

    // 创建Word文档
    const children = [];

    // 标题
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(`${year}年第${weekNum}周工作周报`)],
      spacing: { after: 400 }
    }));

    // 先按项目分组，再按任务分组
    const groupedByProject = {};
    for (const report of reports) {
      if (report.content && report.content.length > 0) {
        report.content.forEach(item => {
          // 兼容旧数据：如果没有 project 字段，使用空字符串
          const projectName = item.project || '';
          const taskName = item.task || '';

          if (!groupedByProject[projectName]) {
            groupedByProject[projectName] = {};
          }

          // 按任务名称分组（忽略大小写）
          const taskKey = taskName.toLowerCase();
          if (!groupedByProject[projectName][taskKey]) {
            groupedByProject[projectName][taskKey] = {
              displayName: taskName,
              items: []
            };
          }

          groupedByProject[projectName][taskKey].items.push({
            person: report.name,
            progress: item.progress
          });
        });
      }
    }

    // 按项目和任务组织内容
    const projectNames = Object.keys(groupedByProject).sort((a, b) => {
      // 空项目（无项目）放最后
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b);
    });

    for (const projectName of projectNames) {
      // 项目名称作为二级标题（如果有项目）
      if (projectName) {
        children.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(projectName)],
          spacing: { before: 400, after: 200 }
        }));
      }

      // 按任务名称排序
      const tasks = Object.values(groupedByProject[projectName]).sort((a, b) => {
        return a.displayName.localeCompare(b.displayName);
      });

      for (const task of tasks) {
        // 任务名称作为三级标题
        children.push(new Paragraph({
          heading: projectName ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
          children: [new TextRun(task.displayName)],
          spacing: { before: 300, after: 200 }
        }));

        // 每个人的进展
        task.items.forEach((item) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${item.person}：`, bold: true }),
              new TextRun(item.progress)
            ],
            indent: { left: 400 },
            spacing: { after: 100 }
          }));
        });
      }
    }

    const doc = new Document({
      sections: [{
        children: children
      }]
    });

    // 生成Word文件
    const buffer = await Packer.toBuffer(doc);

    console.log(`Generated document buffer, size: ${buffer.length} bytes`);

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=weekly-report-${week}.docx`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取所有周列表（用于下拉选择）
router.get('/', async (req, res) => {
  try {
    const weeks = await WeeklyReport.distinct('week');
    weeks.sort().reverse();
    res.json({ success: true, data: weeks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取指定周的所有周报，支持按课题组筛选
router.get('/:week', async (req, res) => {
  try {
    const week = req.params.week;
    const group = req.query.group;
    let query = { week };
    if (group && group !== 'all') {
      query.group = group;
    }
    const reports = await WeeklyReport.find(query).sort({ name: 1 });
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取某人某周的周报（用于编辑）
router.get('/:week/:name', async (req, res) => {
  try {
    const { week, name } = req.params;
    const report = await WeeklyReport.findOne({ week, name });
    if (!report) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建或更新周报
router.post('/', async (req, res) => {
  try {
    const { week, name, group, content, notes } = req.body;

    if (!week || !name || !content) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    // 查找是否已存在
    const existing = await WeeklyReport.findOne({ week, name });

    if (existing) {
      // 更新
      existing.content = content;
      if (group !== undefined) {
        existing.group = group;
      }
      if (notes !== undefined) {
        existing.notes = notes;
      }
      existing.updated_at = new Date();
      await existing.save();
      res.json({ success: true, data: existing, message: '更新成功' });
    } else {
      // 创建
      const report = new WeeklyReport({
        week,
        name,
        group: group || '',
        content,
        notes: notes || ''
      });
      await report.save();
      res.json({ success: true, data: report, message: '创建成功' });
    }
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, error: '本周你已经提交过周报了' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// 更新周报（允许修改任务和进展）
router.put('/:id', async (req, res) => {
  try {
    const { content, notes } = req.body;
    const report = await WeeklyReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, error: '周报不存在' });
    }

    report.content = content;
    if (notes !== undefined) {
      report.notes = notes;
    }
    report.updated_at = new Date();
    await report.save();

    res.json({ success: true, data: report, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 不提供删除接口，符合设计要求：禁止删除整条周报

module.exports = router;
