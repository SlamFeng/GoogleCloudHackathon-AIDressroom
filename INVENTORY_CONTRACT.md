# 库存子系统契约 · 商品 / 库存 / 预约

> 版本：**v1.0**｜日期：2026-07-04
> 状态：MVP 正式契约
> 用途：定义单店铺库存管理子系统的数据模型、预约生命周期与运营接口。
> 消费方：造型 Agent（`search_inventory` / `reserve_items` / `confirm_purchase` / `create_store_route`）、店员运营接口。

---

## 1. 背景与边界

Agent 拿顾客当前穿搭（`outfit_profile`，见 `OUTFIT_PROFILE_CONTRACT.md`）识别出的**类别 / 颜色 / 风格**去查询库存。因此本契约的类别、颜色、风格枚举**必须与 `outfit_profile` v1.0 对齐**，否则检索会静默漏项。

负责：
- 商品主数据的增删改查。
- 分尺码库存量、可用量计算、低库存判定。
- 预约锁定 → 确认购买真实扣减 → 释放 / 过期的完整生命周期（**不超卖**）。
- 店内取货路线。

不负责：
- 多店铺 / 跨仓调拨（单店铺）。
- 支付与订单财务。
- 出入库单据、盘点等完整 WMS 流程（暂不纳入）。

---

## 2. 数据模型（3 个集合）

### 2.1 `products/{product_id}` — 商品主数据（较静态）

| 字段 | 类型 | 说明 |
|---|---|---|
| `product_id` | string | 主键 |
| `sku` | string | 店铺 SKU |
| `name` | string | 商品名 |
| `category` | enum | 见 §3，对齐 outfit_profile v1.0 |
| `price_yen` | int ≥0 | 日元价格 |
| `colors` | enum[] | 标准颜色枚举，至少 1 个 |
| `style_tags` | enum[] | 标准风格枚举 |
| `body_template_tags` | string[] | 适配的体型模板 id |
| `seasonal_rank` | int 0–10 | 季节权重，用于排序 |
| `location` | `{area, shelf}` | 店内位置，取货路线用 |
| `image_url` / `vton_reference_image_url` / `vton_prompt` | string | 展示与虚拟试穿字段 |
| `active` | bool | 下架 = false（软删除） |
| `created_at` / `updated_at` | ISO string | 时间戳 |

### 2.2 `inventory/{product_id}` — 分尺码库存（热数据）

| 字段 | 类型 | 说明 |
|---|---|---|
| `product_id` | string | 关联商品 |
| `levels` | `Record<size, {on_hand, reserved}>` | 每尺码在库量与预约量 |
| `restock_threshold` | int ≥0 | 补货阈值（总可用量 ≤ 此值即为低库存） |
| `updated_at` | ISO string | 时间戳 |

**核心不变式：** `available = max(0, on_hand - reserved)`。`available` 从不落库，永远实时派生。

### 2.3 `reservations/{reservation_id}` — 预约单

| 字段 | 类型 | 说明 |
|---|---|---|
| `reservation_id` | string | 主键 |
| `session_id` | string | 发起预约的 Agent 会话 |
| `items` | `{product_id, size, qty}[]` | 预约行 |
| `status` | enum | `held` / `confirmed` / `released` / `expired` |
| `created_at` / `expires_at` / `confirmed_at` | ISO string | 时间戳 |

---

## 3. 类别 / 颜色 / 风格枚举

**`category`（九类，= outfit_profile v1.0 减去不可售的 `unknown`）：**

```
outerwear  top  bottom  dress  one_piece  shoes  headwear  bag  accessory
```

`colors` 与 `style_tags` 直接复用 `OUTFIT_PROFILE_CONTRACT.md` §6.1 / §6.2 的标准枚举。

> 注：代码里的 `outfitSlotSchema`（outerwear/top/bottom/dress/shoes/accessory）是**试穿槽位**，是本类别集的子集；库存接回 Agent 时做一层映射，两者不冲突。

---

## 4. 预约生命周期（不超卖）

```
reserve ──held──> confirm_purchase ──confirmed（on_hand 真实扣减）
                └─ release / TTL 过期 ──released|expired（reserved 归还）
```

1. **reserve**（原子）：逐行检查 `available`，**全有或全无**——任一行不足则整单失败并返回缺口 `shortfalls`（Agent 据此换品）。成功则各行 `reserved += qty`，写入 `held` 预约单，设 `expires_at = now + TTL`。
2. **confirm_purchase**（原子）：仅对 `held` 生效。各行 `on_hand -= qty` 且 `reserved -= qty`，预约转 `confirmed`。这是**唯一真正减少在库的动作**。
3. **release / 过期清扫**（原子）：各行 `reserved -= qty` 归还，预约转 `released` / `expired`。后台 sweeper 定时释放超时的 `held`。

**原子性保证：** 内存后端靠"同步临界区无 await"，Firestore 后端靠 `runTransaction`——两者共用同一份 `planReservation` 策略函数，行为一致。并发抢最后一件时，恰有一个成功。

> 预约策略（全有或全无）在 `server/inventory/memory-repository.ts` 的 `planReservation` 里，是可替换的纯函数；改成"部分满足"或"缺货预订"只需改这一处 + 对应测试。

---

## 5. 运营 HTTP API（`/api/inventory`，非前端）

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/products` | 搜索（`?category=&color=&style=&avoid_color=&avoid_style=&max_price=&size=&in_stock=&limit=`，逗号分隔多值） |
| GET | `/products/:id` | 商品 + 库存详情 |
| POST | `/products` | 新增商品 |
| PATCH | `/products/:id` | 修改商品 |
| DELETE | `/products/:id` | 下架（软删除） |
| GET | `/levels` / `/levels/:id` | 库存量 |
| POST | `/levels/:id/restock` | 补货（`{additions:{size:delta}, restock_threshold?}`） |
| PATCH | `/levels/:id` | 覆盖设定在库（`{on_hand_by_size:{size:n}}`，保留 reserved） |
| GET | `/low-stock` | 低库存清单 |
| GET | `/reservations` | 预约列表（`?session_id=&status=`） |
| POST | `/reservations` · `/reservations/:id/confirm` · `/reservations/:id/release` | 预约生命周期（主要由 Agent 调用，运营/调试可直接用） |

---

## 6. 后端与配置

| 变量 | 默认 | 说明 |
|---|---|---|
| `INVENTORY_BACKEND` | `memory` | `memory`（内存，自动灌种子，测试用）/ `firestore`（Cloud Run 生产） |
| `INVENTORY_RESERVATION_TTL_SEC` | `900` | 预约 hold 存活时长 |
| `GOOGLE_CLOUD_PROJECT` | — | firestore 后端项目 id |
| `FIRESTORE_EMULATOR_HOST` | — | 设置后 SDK 连本地模拟器 |

两套后端实现同一 `InventoryRepository` 接口；业务层、Agent 工具、运营 API 只依赖接口，不感知底层。

---

## 7. 校验规则

- 所有枚举英文小写，大小写敏感。
- `on_hand`、`reserved`、`qty` 为非负整数；`qty` 为正整数。
- `available` 不存储，实时派生且不为负。
- 类别 / 颜色 / 风格必须落在 §3 枚举内。
- 结构化输入在服务端经 zod 校验后才落库。

---

## 8. 变更记录

- v1.0（2026-07-04）：单店铺库存子系统首版——商品/库存/预约模型、全有或全无预约、真实扣减、运营 API、内存 + Firestore 双后端。
