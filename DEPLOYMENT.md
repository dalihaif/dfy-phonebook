# 企业通讯录 PWA 部署文档

## 📋 项目概述

企业通讯录 PWA — 基于 IndexedDB 的离线可用通讯录应用，支持 Excel 导入/导出、权限管理、响应式布局。

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| 前端框架 | 原生 HTML/CSS/JS（无框架依赖） |
| 离线存储 | IndexedDB |
| Excel 处理 | SheetJS (xlsx.full.min.js) |
| PWA | Service Worker + manifest.json |
| 部署平台 | 腾讯云 CloudBase / 任意静态托管 |

## 📁 文件结构

```
project-root/
├── index.html              # 主入口
├── manifest.json           # PWA 配置
├── service-worker.js       # 离线缓存策略
├── css/style.css           # 全局响应式样式
├── js/
│   ├── app.js              # 页面渲染、事件绑定、筛选联动
│   ├── db.js               # IndexedDB 封装
│   ├── excel.js            # 导入/导出核心逻辑
│   └── permission.js       # 权限切换与管理
├── lib/xlsx.full.min.js    # SheetJS 本地副本
├── icons/                  # PWA 图标（SVG 占位）
├── data/sample-data.json   # 初始测试数据（15条）
└── DEPLOYMENT.md           # 本文件
```

## 🚀 部署步骤

### 方式一：腾讯云 CloudBase（推荐）

1. 安装 CloudBase CLI：
   ```bash
   npm install -g @cloudbase/cli
   ```

2. 登录并关联环境：
   ```bash
   tcb login
   tcb env:list
   ```

3. 部署到静态网站托管：
   ```bash
   tcb hosting deploy ./project-root -e <你的环境ID>
   ```

4. 访问分配的域名即可使用

### 方式二：任意静态托管（Nginx / Apache / GitHub Pages）

1. 将 `project-root/` 下所有文件上传至网站根目录
2. 确保 MIME 类型包含 `.json` → `application/json`
3. 配置 HTTPS（PWA 必需）
4. 确保 Service Worker 的缓存策略生效

### 方式三：本地开发测试

```bash
cd project-root
# 使用任意静态服务器，例如：
npx serve .
# 或 Python
python -m http.server 8080
```

浏览器访问 `http://localhost:8080`

> ⚠️ Service Worker 仅在 HTTPS 或 localhost 下工作

## 📦 依赖安装

### SheetJS 本地副本

如果 `lib/xlsx.full.min.js` 为空或缺失，执行：

```bash
cd project-root/lib
curl -o xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js
```

或从 [SheetJS 官方](https://sheetjs.com/) 下载。

## 💾 数据备份教程

### 方法一：应用内导出

1. 点击底部「📤 导出」按钮
2. 自动下载 `通讯录_YYYYMMDD.xlsx` 文件
3. 将文件保存至安全位置（建议网盘 + 本地双重备份）

### 方法二：手动导出 IndexedDB

1. 打开浏览器开发者工具（F12）→ Application → IndexedDB → PhoneBookDB
2. 右键 contacts 存储对象 → Export（部分浏览器支持）
3. 保存为 JSON 文件

### 方法三：定时备份脚本（高级）

```javascript
// 在浏览器控制台或定时任务中执行
async function backupContacts() {
  const contacts = await getAllContacts();
  const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `通讯录备份_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
backupContacts();
```

### 数据恢复

从 JSON 备份恢复：
```javascript
async function restoreFromJSON(jsonStr) {
  const contacts = JSON.parse(jsonStr);
  // 先清空再导入
  await clearAll();
  await addContacts(contacts);
  location.reload();
}
```

从 Excel 备份恢复：使用应用内的「📥 导入」功能。

## 🔐 权限说明

| 角色 | 查看 | 新增 | 编辑 | 删除 | 导入 | 导出 |
|------|------|------|------|------|------|------|
| 管理员 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 编辑者 ✏️ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| 查看者 👁️ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

- 点击右上角角色图标可循环切换
- 角色选择保存在 localStorage，重启浏览器保持

## ⚠️ 注意事项

1. **HTTPS 必需**：Service Worker 和 PWA 安装仅在 HTTPS（或 localhost）环境生效
2. **浏览器兼容**：推荐 Chrome / Edge / Safari 最新版
3. **数据存储**：所有数据存储在浏览器 IndexedDB，清除浏览器数据会导致丢失
4. **定期备份**：建议每周至少导出一次 Excel 备份
5. **首次访问**：首次打开自动加载 `data/sample-data.json` 示例数据

## 📞 故障排查

| 问题 | 解决方案 |
|------|---------|
| PWA 无法安装 | 确认 HTTPS、manifest.json 可访问、Service Worker 已注册 |
| 离线不可用 | 检查 Service Worker 是否激活（DevTools → Application → SW） |
| 导入 Excel 失败 | 确认列名包含"姓名"列，检查文件格式为 .xlsx |
| 数据丢失 | 从备份文件恢复，或重新导入 |
| 拨号无反应 | 确认设备支持 `tel:` 协议（手机正常，桌面端需拨号软件） |
