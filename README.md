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

后端当前使用确定性的 mock 分析，目的是先稳定页面、HTTP 接口和下游契约。替换点位于：

```text
server/mock-analysis.ts
```

接入 Gemini 时应继续输出同一份正式 Schema：

- `schemas/body-profile.schema.json`
- `schemas/outfit-profile.schema.json`
- `schemas/analysis-handoff.schema.json`

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
