# 敏捷周报管理系统

基于设计文档实现的敏捷周报管理系统。

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Node.js + Express
- **数据库**: MongoDB
- **Word导出**: docx

## 项目结构

```
weekly-report-spa/
├── backend/              # 后端代码
│   ├── models/          # 数据模型
│   ├── routes/          # API路由
│   ├── server.js        # 入口文件
│   └── package.json
├── frontend/            # 前端代码
│   ├── src/
│   │   ├── api/        # API接口
│   │   ├── utils/      # 工具函数
│   │   ├── router/     # 路由配置
│   │   ├── views/      # 页面组件
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── design.md            # 原始设计文档
├── package.json         # 根配置
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 启动MongoDB

确保本地MongoDB运行在 `mongodb://localhost:27017/weekly_report`

### 3. 启动开发服务

```bash
npm run dev
```

前端将运行在 `http://localhost:8080`
后端API运行在 `http://localhost:3000`

### 4. 构建生产版本

```bash
npm run build
```

然后启动后端即可：

```bash
cd backend
npm start
```

## 功能特性

根据设计文档实现：

1. ****
   - 自动填充姓名（localStorage）
   - 动态添加/删除工作项
   - 自动保存草稿到 localStorage
   - 同一人同一周只允许一条周报（unique索引）
   - 支持编辑已提交周报

2. **查看周报**
   - 按周分组展示所有人周报
   - 支持切换周查看
   - 导出本周为Word文档

3. **数据安全**
   - 后端不提供删除接口，符合设计要求"禁止删除整条周报"
   - 允许修改任务和进展

4. **体验优化**
   - 自动识别当前周（ISO week算法）
   - 防止重复提交（数据库unique约束）

## API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/reports` | 获取所有周列表 |
| GET | `/api/reports/:week` | 获取指定周所有周报 |
| GET | `/api/reports/:week/:name` | 获取某人某周周报 |
| POST | `/api/reports` | 创建或更新周报 |
| PUT | `/api/reports/:id` | 更新周报 |
| GET | `/api/reports/export/:week` | 导出本周Word |

## 数据模型

**weekly_reports** 集合：

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | ObjectId | 主键 |
| week | string | 周标识（如 2026-W14） |
| name | string | 姓名 |
| content | array | 工作内容 `[{task, progress}]` |
| created_at | date | 创建时间 |
| updated_at | date | 更新时间 |

复合唯一索引：`{week: 1, name: 1}`
