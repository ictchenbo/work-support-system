require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 环境变量
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weekly_report';

// 连接MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// API路由
app.use('/api/reports', require('./routes/reports'));
app.use('/api/monthly-summaries', require('./routes/monthlySummaries'));
app.use('/api/project-tasks', require('./routes/projectTasks'));
app.use('/api/requirements', require('./routes/requirements'));

// 如果前端构建了，可以提供静态文件服务
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 所有其他请求返回index.html（SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
