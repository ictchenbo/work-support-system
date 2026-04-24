const express = require('express');
const router = express.Router();
const Requirement = require('../models/Requirement');

// 获取指定用户的所有需求，按更新时间降序排列
router.get('/', async (req, res) => {
  try {
    const { user } = req.query;
    if (!user) {
      return res.status(400).json({ success: false, error: '用户名为空' });
    }
    const requirements = await Requirement.find({ user }).sort({ updated_at: -1 });
    res.json({ success: true, data: requirements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建新需求
router.post('/', async (req, res) => {
  try {
    const { user, title, description } = req.body;

    if (!user) {
      return res.status(400).json({ success: false, error: '用户名为空' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: '需求标题不能为空' });
    }

    const requirement = new Requirement({
      user,
      title: title.trim(),
      description: (description || '').trim(),
      completed: false
    });
    await requirement.save();

    res.json({ success: true, data: requirement, message: '创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 切换完成状态
router.put('/:id/toggle', async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);

    if (!requirement) {
      return res.status(404).json({ success: false, error: '需求不存在' });
    }

    requirement.completed = !requirement.completed;
    requirement.updated_at = new Date();
    await requirement.save();

    res.json({ success: true, data: requirement, message: '状态已更新' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新需求
router.put('/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    const requirement = await Requirement.findById(req.params.id);

    if (!requirement) {
      return res.status(404).json({ success: false, error: '需求不存在' });
    }

    if (title && title.trim()) {
      requirement.title = title.trim();
    }
    if (description !== undefined) {
      requirement.description = description.trim();
    }
    requirement.updated_at = new Date();

    await requirement.save();

    res.json({ success: true, data: requirement, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除需求
router.delete('/:id', async (req, res) => {
  try {
    const requirement = await Requirement.findByIdAndDelete(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, error: '需求不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
