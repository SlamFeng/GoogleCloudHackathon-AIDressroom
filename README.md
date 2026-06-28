# AIDA 图像采集与分析模块

Hackathon MVP 的入口模块，面向普通笔记本浏览器：

1. 门户与隐私授权。
2. 用户输入身高、体重、性别呈现和年龄段。
3. MediaPipe Pose 检查单人、全身入框与稳定姿态。
4. 自动倒计时抓取单张正面全身照。
5. 通过 HTTP API 获得 `body_profile` 与 `outfit_profile`。
6. 用户确认或修正后，将结构化结果交给下一个造型 Agent。

## 本地运行

```bash
npm install
npm run setup:assets
npm run dev
```

- Web：`http://localhost:5173`
- API：`http://localhost:8787`
- 健康检查：`http://localhost:8787/api/health`

摄像头要求安全上下文。`localhost` 可直接使用；远程部署必须使用 HTTPS。

## 当前分析模式

图片分析能力现在以 Google ADK `FunctionTool` 形式交付，HTTP API 只作为本地前端 demo 的兼容层。

ADK Agent 可直接引入：

```ts
import { analyzeFullBodyDressroomImageTool } from "./dist-server/image-analysis-tool.js";

const tools = [analyzeFullBodyDressroomImageTool];
```

Tool 名称：

```text
analyze_full_body_dressroom_image
```

输入参数：

- `capture_data_url`: 正面全身照，格式为 `data:image/*;base64,...`
- `manual_profile`: 用户手动提供的 `height_cm`、`weight_kg`、`gender_presentation`、`age_range`
- `analysis_mode`: `mock` 或 `ai`
- `session_id`: 可选；不传时 tool 会生成 `tool_ses_*`

Tool 成功时返回 `body_profile` 与 `outfit_profile`，继续遵守：

- `schemas/body-profile.schema.json`
- `schemas/outfit-profile.schema.json`
- `schemas/analysis-handoff.schema.json`

当前 `mock` 模式使用确定性的 mock 分析，目的是先稳定页面、tool 参数和下游契约。替换点位于：

```text
server/image-analysis-tool.ts
```

`ai` 模式的入口已经预留，但真实多模态模型调用尚未接入；接入 Gemini 时应替换 `analyzeDressroomImage` 中的 AI 分支，并继续输出同一份正式 Schema：

```text
server/image-analysis-tool.ts
```

## MediaPipe 模型

浏览器读取：

```text
public/models/pose_landmarker_lite.task
public/mediapipe/wasm/*
```

`npm run setup:assets` 会把 `@mediapipe/tasks-vision` 的 WASM 文件复制到 `public/mediapipe/wasm`，
并在缺失时下载 Pose Landmarker Lite 模型。模型加载失败时仍保留手动拍摄作为演示兜底。

## 隐私边界

- 未同意时不启动摄像头。
- 不做人脸身份识别。
- HTTP 响应只返回内部 `source_capture_id`。
- 当前 mock 服务不持久化原始图片。
- 正式云端实现需在会话结束时删除对象存储中的原图。
