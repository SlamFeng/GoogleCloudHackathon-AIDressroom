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
- `analysis_mode`: 可选，默认 `ai`；`mock` 仅用于本地契约测试
- `session_id`: 可选；不传时 tool 会生成 `tool_ses_*`

Tool 成功时返回 `body_profile` 与 `outfit_profile`，继续遵守：

- `schemas/body-profile.schema.json`
- `schemas/outfit-profile.schema.json`
- `schemas/analysis-handoff.schema.json`

当前正式 OOTD 识别路径会在服务端调用 Gemini。启动前设置：

```bash
cp .env.example .env
# 然后在 .env 中填写 GEMINI_API_KEY
```

也可以使用 `GOOGLE_API_KEY` 作为 key 环境变量。Gemini 调用位于：

```text
server/image-analysis-tool.ts
```

实现要点：

- API key 只在服务端读取，不暴露到浏览器。
- 图片从 tool 参数 `capture_data_url` 解析为 Gemini inline image data。
- 使用项目现有 JSON Schema 生成 `responseJsonSchema`，要求 Gemini 返回结构化 JSON。
- OOTD 识别会把正面全身照拆成可见单品、主色、风格、版型、材质外观和定位区域。
- 每个可见单品会先根据归一化区域生成服务端定位参考图，再由 Gemini 图片模型做单品提取/重建，最后生成干净背景的商品风图片；定位参考图不会作为前端单品图展示，也不推断品牌、价格或 SKU。
- `session_id`、`analysis_id`、`analysis_mode`、`captured_at`、`source_capture_id` 由工具侧生成或覆盖，避免模型编造系统字段。

当前默认使用 `gemini-3.5-flash` 做图片理解与结构化输出，使用 `gemini-3-pro-image` 生成高保真商品风单品图片。如果你的 key 暂时没有模型权限，或想切换到更新的 Nano Banana / Gemini 图片编辑模型，可以分别通过 `GEMINI_MODEL` 或 `GEMINI_IMAGE_MODEL` 覆盖。

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
- 当前本地服务不持久化原始图片。
- 正式云端实现需在会话结束时删除对象存储中的原图。
