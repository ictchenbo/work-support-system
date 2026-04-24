const express = require('express');
const router = express.Router();
const ProjectTask = require('../models/ProjectTask');

// 获取所有项目
router.get('/', async (req, res) => {
  try {
    const projects = await ProjectTask.find().sort({ name: 1 });
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取单个项目
router.get('/:id', async (req, res) => {
  try {
    const project = await ProjectTask.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建项目
router.post('/', async (req, res) => {
  try {
    const { name, tasks } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: '项目名称不能为空' });
    }

    const project = new ProjectTask({
      name: name.trim(),
      tasks: tasks || []
    });
    await project.save();

    res.json({ success: true, data: project, message: '创建成功' });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, error: '项目名称已存在' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// 更新项目
router.put('/:id', async (req, res) => {
  try {
    const { name, tasks } = req.body;
    const project = await ProjectTask.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }

    if (name && name.trim()) {
      project.name = name.trim();
    }
    if (tasks !== undefined) {
      project.tasks = tasks;
    }
    project.updated_at = new Date();

    await project.save();

    res.json({ success: true, data: project, message: '更新成功' });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, error: '项目名称已存在' });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// 删除项目
router.delete('/:id', async (req, res) => {
  try {
    const project = await ProjectTask.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
