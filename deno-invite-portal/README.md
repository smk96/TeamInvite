# ChatGPT 邀请管理面板 (Deno TypeScript 版本)

一个基于 Deno + Oak 框架的 Web 应用，用于批量管理 ChatGPT 团队邀请。

## 功能特性

- 🦕 **Deno 运行时** - 使用现代化的 Deno 运行时和 TypeScript
- 🌐 **现代化 Web 界面** - 响应式设计，支持移动端
- 📧 **批量邀请管理** - 支持多邮箱批量邀请
- 🔧 **在线配置** - 通过管理面板配置 Bearer Token
- 📊 **实时状态监控** - 显示连接状态和配置状态
- 🎨 **美观的 UI 设计** - 渐变背景和现代化界面
- ⚡ **一键启动** - 提供 bat 脚本快速启动

## 项目结构

```
deno-invite-portal/
├── main.ts                   # Deno 主应用
├── deno.json                 # Deno 配置文件
├── README.md                 # 项目说明
├── start.bat                 # Windows 启动脚本
├── static/                   # 静态资源
│   ├── style.css            # 样式文件
│   ├── script.js            # 主页面 JavaScript
│   └── admin.js             # 管理面板 JavaScript
└── templates/               # HTML 模板
    ├── index.html           # 主页面
    └── admin.html           # 管理面板
```

## 快速开始

### 前置要求

确保已安装 Deno：
```bash
# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh
```

### 方法一：使用 bat 脚本（Windows 推荐）

1. 双击 `start.bat` 文件
2. 脚本会自动启动应用
3. 访问 http://localhost:5000

### 方法二：使用 Deno 命令

1. 开发模式（带热重载）：
```bash
deno task dev
```

2. 生产模式：
```bash
deno task start
```

3. 访问应用：
- 主页面：http://localhost:5000
- 管理面板：http://localhost:5000/admin

## 使用说明

### 1. 配置 Token

首次使用需要配置 Bearer Token：

1. 访问管理面板：http://localhost:5000/admin
2. 输入您的 ChatGPT Bearer Token
3. 输入 Account ID（可选，有默认值）
4. 点击"保存配置"

### 2. 发送邀请

1. 在主页面输入邮箱地址（支持多个，用逗号分隔）
2. 选择用户角色：
   - 标准用户
   - 管理员
   - 查看者
3. 选择是否重新发送邮件（如果用户已被邀请）
4. 点击"发送邀请"

### 3. 查看结果

- 成功：显示绿色成功信息和 API 响应详情
- 失败：显示红色错误信息和具体错误代码

## 技术栈

- **运行时**：Deno 2.0+
- **后端框架**：Oak (Deno 的 Koa 风格框架)
- **语言**：TypeScript
- **前端**：HTML5 + CSS3 + JavaScript ES6+
- **样式**：现代化 CSS（渐变、动画、响应式）
- **API**：RESTful API 设计

## API 接口

### 主要端点

- `GET /` - 主页面
- `GET /admin` - 管理面板
- `POST /api/invite` - 发送邀请
- `GET /api/config` - 获取配置信息
- `GET/POST /api/admin/config` - 管理员配置
- `GET /health` - 健康检查

### 邀请 API 请求格式

```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "role": "standard-user",
  "resend": false
}
```

## 环境变量

可选的环境变量配置：

- `CHATGPT_BEARER_TOKEN` - ChatGPT Bearer Token
- `CHATGPT_ACCOUNT_ID` - ChatGPT Account ID
- `CHATGPT_IMPERSONATE_UA` - 自定义 User-Agent

### 设置环境变量

Windows (PowerShell):
```powershell
$env:CHATGPT_BEARER_TOKEN="your-token-here"
$env:CHATGPT_ACCOUNT_ID="your-account-id"
```

Windows (CMD):
```cmd
set CHATGPT_BEARER_TOKEN=your-token-here
set CHATGPT_ACCOUNT_ID=your-account-id
```

Linux/macOS:
```bash
export CHATGPT_BEARER_TOKEN="your-token-here"
export CHATGPT_ACCOUNT_ID="your-account-id"
```

## Deno 权限说明

应用需要以下权限：
- `--allow-net` - 网络访问（HTTP 服务器和 API 调用）
- `--allow-env` - 读取环境变量
- `--allow-read` - 读取静态文件和模板

## 注意事项

1. **Token 安全**：请妥善保管您的 Bearer Token
2. **网络环境**：确保能够访问 ChatGPT API
3. **权限要求**：Token 需要有邀请用户的权限
4. **错误处理**：应用会显示详细的错误信息帮助诊断问题

## 常见问题

### Q: 显示 401/403 错误怎么办？
A: 检查 Token 是否正确，是否有相应权限，Account ID 是否匹配。

### Q: 如何获取 Bearer Token？
A: 登录 ChatGPT 网页版，在开发者工具中查看网络请求的 Authorization 头。

### Q: 支持哪些用户角色？
A: 支持 standard-user（标准用户）、admin（管理员）、viewer（查看者）。

### Q: 为什么选择 Deno？
A: Deno 提供了更好的安全性、内置 TypeScript 支持、现代化的模块系统和更好的开发体验。

## 从 Python 版本迁移

如果您之前使用 Python/Flask 版本：

1. 功能完全一致，API 接口保持兼容
2. 前端代码无需修改
3. 环境变量名称相同
4. 配置方式相同

主要区别：
- 使用 Deno 替代 Python
- 使用 Oak 替代 Flask
- 使用 TypeScript 替代 Python
- 无需 pip/virtualenv，Deno 自动管理依赖

## 更新日志

- **v2.0.0** - Deno TypeScript 版本发布
  - 使用 Deno 运行时
  - TypeScript 类型安全
  - Oak 框架
  - 保持所有原有功能

## 许可证

MIT License
