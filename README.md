# 大理大学第一附属医院通讯录 PWA

> 离线可用 · 一键拨号 · 添加到主屏幕 · 手机桌面直达

## 📱 在线访问

| 平台 | 地址 |
|------|------|
| **GitHub Pages** | https://dalihaif.github.io/dfy-phonebook/ |
| **CloudBase** | https://dfy-phone-d9g4yco335e38bb82-1433886546.tcloudbaseapp.com |

> ⚡ 两个地址内容完全一致，任意可用即可。

---

## ✨ 功能特性

### 🔍 智能搜索
- 支持**中文姓名/科室名**关键词搜索
- 支持**拼音首字母**模糊匹配（如 `bys` → 病案室）
- 搜索结果实时刷新，毫秒级响应

### 📞 一键拨号
- 点击电话号码直接拨打（手机端自动唤起拨号界面）
- 办公电话自动补全区号（`220XXXX` → `0872-220XXXX`）

### 📱 安装到桌面（PWA）
1. 手机浏览器打开上方任一地址
2. 点击浏览器菜单 → **"添加到主屏幕"**
3. 桌面上出现 **「通讯录」** 图标，点击即开，体验接近原生 App

### 📴 离线可用
- 首次加载后自动缓存所有数据
- 无网络时仍可查询、拨号
- Service Worker 自动更新，无需手动刷新

### 📋 数据管理
- 支持 **Excel 批量导入**（`.xlsx`）
- 支持 **导出备份**（生成带时间戳的 Excel 文件）
- 数据格式：`姓名 / 科室 / 职称 / 办公电话 / 手机号 / 短号`

---

## 📊 数据说明

| 项目 | 数量 |
|------|------|
| 个人记录 | 2,140 条 |
| 科室电话 | 508 条 |
| 合计 | **2,648 条** |

数据来源：`通讯录_20260519(4).xlsx`，已转换为标准 JSON 格式。

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML5 + CSS3 + Vanilla JS |
| 数据 | JSON（2,648 条记录） |
| 拼音 | `js/pinyin.js`（CJK 全字符映射） |
| Excel 处理 | SheetJS（`lib/xlsx.full.min.js`） |
| PWA | `manifest.json` + `service-worker.js` |
| 图标 | 大理大学第一附属医院院徽（蓝底 Maskable） |

---

## 📁 项目结构

```
project-root/
├── index.html              # 主页面
├── manifest.json           # PWA 配置（名称、图标、启动方式）
├── service-worker.js      # 离线缓存 + 版本管理
├── css/style.css         # 样式
├── js/
│   ├── app.js            # 主逻辑（搜索、渲染、拨号）
│   ├── db.js             # 数据存储层
│   ├── excel.js          # Excel 导入/导出
│   ├── permission.js     # 通讯录权限管理
│   └── pinyin.js        # 拼音首字母映射
├── data/
│   └── sample-data.json  # 通讯录数据（2648 条）
└── icons/
    ├── icon-72.png ... icon-512.png  # PWA 图标（5 尺寸）
    └── icon-header.png                 # 页面头部图标
```

---

## 🚀 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/dalihaif/dfy-phonebook.git
cd dfy-phonebook

# 2. 启动本地服务器（任选其一）
npx serve .              # 方式一
python -m http.server 8080  # 方式二

# 3. 浏览器访问
open http://localhost:8080
```

> ⚠️ 必须用 **HTTP 服务器** 运行（不能直接双击 `index.html`），否则 Service Worker 无法注册。

---

## 📦 数据格式

`sample-data.json` 每条记录结构：

```json
{
  "name": "李海峰",
  "category": "行政后勤",
  "dept": "综合档案室",
  "title": "馆员",
  "rank": "中职",
  "position": "科员",
  "phone": "0872-2201062",
  "mobile": "13988531240",
  "shortphone": "68560"
}
```

| 字段 | 说明 |
|------|------|
| `name` | 姓名（科室记录为科室名） |
| `category` | 分类：`行政后勤` / `临床科室` / `医技科室` |
| `dept` | 所属部门 |
| `title` | 职称（科室记录为空） |
| `rank` | 职级（正高/副高/中职/初职） |
| `position` | 职务 |
| `phone` | 办公电话 |
| `mobile` | 手机号码 |
| `shortphone` | 短号 |

---

## 🔄 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| `v20260520c` | 2026-05-20 | 更新通讯录数据（2648 条） |
| `v20260520b` | 2026-05-20 | 急诊科电话更换为 0872-2201120 |
| `v20260520a` | 2026-05-20 | 更换院徽图标，应用名称改为「通讯录」 |
| `v20260519` | 2026-05-19 | 初始版本发布 |

---

## 📄 许可

© 2026 大理大学第一附属医院 · 仅供内部使用

---

## 📮 联系方式

- 项目地址：https://github.com/dalihaif/dfy-phonebook
- 问题反馈：通过 GitHub Issues 提交 📱：13988531240 📧：dalihaif@qq.com
