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

当前 `mock` 模式使用确定性的 mock 分析，目的是先稳定页面、tool 参数和下游契约。

`ai` 模式会在服务端调用 Gemini。启动前设置：

```bash
export GEMINI_API_KEY="你的 Google AI Studio API key"
# 可选，默认 gemini-2.5-flash
export GEMINI_MODEL="gemini-2.5-flash"
```

也可以使用 `GOOGLE_API_KEY` 作为 key 环境变量。Gemini 调用位于：

```text
server/image-analysis-tool.ts
```

实现要点：

- API key 只在服务端读取，不暴露到浏览器。
- 图片从 tool 参数 `capture_data_url` 解析为 Gemini inline image data。
- 使用项目现有 JSON Schema 生成 `responseJsonSchema`，要求 Gemini 返回结构化 JSON。
- `session_id`、`analysis_id`、`analysis_mode`、`captured_at`、`source_capture_id` 由工具侧生成或覆盖，避免模型编造系统字段。

## MediaPipe 模型

浏览器读取：

```text
public/models/pose_landmarker_lite.task
public/mediapipe/wasm/*
```

`npm run setup:assets` 会把 `@mediapipe/tasks-vision` 的 WASM 文件复制到 `public/mediapipe/wasm`，
并在缺失时下载 Pose Landmarker Lite 模型。模型加载失败时仍保留手动拍摄作为演示兜底。

## 库存管理子系统

单店铺库存子系统，为造型 Agent 提供商品检索、库存预约与真实扣减，并暴露一套运营接口。完整契约见 `INVENTORY_CONTRACT.md`。

代码位于 `server/inventory/`，业务逻辑只依赖 `InventoryRepository` 接口，底层可切换内存或 Firestore。

### 后端切换

```bash
# 默认：内存后端，自动灌 40+ 件种子商品，零配置，测试用
INVENTORY_BACKEND=memory

# 生产：Cloud Firestore（需先灌库，见下）
INVENTORY_BACKEND=firestore
```

`GET /api/health` 会回显当前 `inventory_backend`。

### 运营 HTTP API（`/api/inventory`）

```text
GET    /products?category=&color=&style=&avoid_color=&max_price=&size=&in_stock=&limit=
GET    /products/:id
POST   /products              新增商品
PATCH  /products/:id          修改商品
DELETE /products/:id          下架（软删除）
GET    /levels · /levels/:id  库存量
POST   /levels/:id/restock    补货  { "additions": { "M": 5 } }
PATCH  /levels/:id            覆盖设定在库  { "on_hand_by_size": { "M": 2 } }
GET    /low-stock             低库存清单
GET    /reservations?session_id=&status=
POST   /reservations · /reservations/:id/confirm · /reservations/:id/release
```

### Agent 工具

造型 Agent 通过以下工具消费库存，全部写入 `tool_calls` 日志：

- `search_inventory`（推荐时按约束检索实时库存）
- `reserve_items`（确认搭配时锁定库存，全有或全无）
- `confirm_purchase`（`POST /api/agent/sessions/:id/purchase` 触发，真实扣减在库）
- `create_store_route`（按仓位生成店内取货路线）

### 本地跑 Firestore（模拟器）

```bash
# 需要 Firebase CLI 或 gcloud
firebase emulators:start --only firestore        # 或 gcloud emulators firestore start
export FIRESTORE_EMULATOR_HOST=localhost:8080
export INVENTORY_BACKEND=firestore
export GOOGLE_CLOUD_PROJECT=demo-aidressroom      # 模拟器下任意 id 即可
npm run seed:inventory                            # 灌种子数据
npm run dev
```

### 部署到 Cloud Run（真 Firestore）

1. 建 GCP 项目并开启 Firestore（Native 模式）。
2. `gcloud auth application-default login`，或给 Cloud Run 服务账号 `roles/datastore.user`。
3. 设 `INVENTORY_BACKEND=firestore`、`GOOGLE_CLOUD_PROJECT=<项目 id>`（不要设 `FIRESTORE_EMULATOR_HOST`）。
4. `npm run seed:inventory` 灌一次库。

### 测试

```bash
npm run test        # 库存单元测试：可用量、防超卖并发、预约生命周期、补货、低库存
npm run smoke:agent # 端到端：Agent 会话 → 推荐 → 预约 → 确认购买 → 取货路线
```

## 隐私边界

- 未同意时不启动摄像头。
- 不做人脸身份识别。
- HTTP 响应只返回内部 `source_capture_id`。
- 当前 mock 服务不持久化原始图片。
- 正式云端实现需在会话结束时删除对象存储中的原图。
