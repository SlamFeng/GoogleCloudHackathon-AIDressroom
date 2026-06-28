# `body_profile` 字段对接说明 · 试穿预览 ↔ 信息提取

> 版本:**v1.2**｜日期:2026-06-26
> 用途:本文档定义**用户身材信息 `body_profile`** 的字段契约,供「信息提取模块」按此格式产出数据。
> 接收方:试穿预览模块(选模特底图)、穿搭推荐模块(尺码推荐)。

---

## 1. 背景与边界

- 身材信息**不要求用户手填全部**。**用户手动输入 4 项:身高、体重、性别、年龄**;其余字段由**信息提取模块从用户全身照中分析得出**。
- **性别、年龄改为用户输入**:这两项识别错误会让用户产生负面情绪(尤其年龄),且用户自己最清楚、输入成本低,故不交给视觉识别。
- 提取实现方式不限(姿态估计 / 轮廓分割 / 人体测量回归 / 3D 拟合等均可),本文档只约定**输出字段格式**。
- 身高作为照片的比例尺、体重作为体型/围度先验,二者用于把视觉测量标定到真实 cm。

### 字段来源约定

| 来源标记 | 含义 |
|---|---|
| **手输** | 用户输入:`height_cm` + `weight_kg` + `gender_presentation` + `age_range` |
| **照片** | 信息提取模块从全身照分析得出 |
| **系统** | 提取流程附带的元信息 |

---

## 2. 完整数据结构

```jsonc
{
  "body_profile": {
    "schema_version": "1.2",

    // ===== A. 用户手输(4 项)=====
    "height_cm": 168,                 // 身高,单位 cm
    "weight_kg": 58,                  // 体重,单位 kg
    "gender_presentation": "female",  // 见 §3.1 枚举
    "age_range": "26-35",             // 见 §3.6 枚举

    // ===== B. 照片提取 · 类目字段(试穿匹配用)=====
    "body_shape": "hourglass",        // 见 §3.2 统一枚举;无法判断时 null
    "body_size": "average",           // 见 §3.3 枚举
    "proportions": {                  // 见 §3.4,序数枚举
      "shoulder_width":   "average",
      "waist_definition": "defined",
      "hip_width":        "average",
      "leg_to_torso":     "balanced"
    },

    // ===== C. 照片提取 · 围度标量(尺码推荐用,单位 cm)=====
    "measurements": {
      "bust_cm": null,                // 单张正面照通常不稳定
      "waist_cm": null,
      "hip_cm": null,
      "shoulder_cm": 39,
      "inseam_cm": 76,
      "foot_length_cm": null          // 鞋码用;全身照难取,见 §5
    },

    // ===== D. 照片提取 · 外观 =====
    "skin_tone": "light",             // 见 §3.5 枚举

    // ===== E. 系统元信息 =====
    "extraction": {
      "source_capture_id": "cap_123", // 内部拍摄 ID,不使用永久公开 URL
      "captured_views": ["front"],    // MVP 固定 ["front"]
      "overall_confidence": 0.76,     // 0~1
      "field_confidence": {
        "body_shape": 0.82,
        "body_size": 0.90,
        "proportions": {
          "shoulder_width": 0.83,
          "waist_definition": 0.58,
          "hip_width": 0.74,
          "leg_to_torso": 0.88
        },
        "measurements": {
          "bust_cm": 0,
          "waist_cm": 0,
          "hip_cm": 0,
          "shoulder_cm": 0.69,
          "inseam_cm": 0.73,
          "foot_length_cm": 0
        },
        "skin_tone": 0.61
      },
      "analysis_warnings": [
        {
          "code": "SINGLE_VIEW_LIMITATION",
          "affected_fields": [
            "measurements.bust_cm",
            "measurements.waist_cm",
            "measurements.hip_cm"
          ],
          "message": "Circumference estimates were omitted because only a front view was captured."
        }
      ]
    },

    "notes": ""                       // 选填,自由文本
  }
}
```

---

## 3. 字段定义与枚举

### 3.0 字段总表

| 字段 | 类型 | 来源 | 必填 | 消费方 | 说明 |
|---|---|---|---|---|---|
| `schema_version` | string | 系统 | ✅ | 全部 | 固定 `"1.2"` |
| `height_cm` | number | 手输 | ✅ | 尺码推荐 | 身高 cm |
| `weight_kg` | number | 手输 | ✅ | 尺码推荐 | 体重 kg |
| `gender_presentation` | enum | 手输 | ✅ | 试穿匹配 | §3.1 |
| `age_range` | enum | 手输 | ✅ | 图像生成 | §3.6 |
| `body_shape` | enum\|null | 照片 | 键必填 | 试穿匹配 | §3.2 |
| `body_size` | enum\|null | 照片 | 键必填 | 试穿匹配 | §3.3 |
| `proportions.*` | enum\|null | 照片 | 键必填 | 试穿匹配 | §3.4 |
| `measurements.bust_cm` | number\|null | 照片 | 键必填 | 尺码推荐 | 近似胸围 |
| `measurements.waist_cm` | number\|null | 照片 | 键必填 | 尺码推荐 | 近似腰围 |
| `measurements.hip_cm` | number\|null | 照片 | 键必填 | 尺码推荐 | 近似臀围 |
| `measurements.shoulder_cm` | number\|null | 照片 | 键必填 | 尺码推荐 | 近似肩宽 |
| `measurements.inseam_cm` | number\|null | 照片 | 键必填 | 尺码推荐 | 近似内长 |
| `measurements.foot_length_cm` | number\|null | 单独采集 | 选填 | 鞋码 | 见 §5 |
| `skin_tone` | enum\|null | 照片 | 键必填 | 图像生成 | §3.5 |
| `extraction.*` | object | 系统 | ✅ | 溯源/降权 | §3.7 |
| `notes` | string | 系统 | 选填 | 提示补充 | 自由文本 |

### 3.1 `gender_presentation`(性别呈现)· **用户输入**
枚举:`"female" | "male" | "neutral"`
- 用于选男款/女款底图与尺码体系。
- **改为用户输入**:视觉识别性别出错会冒犯用户,故由用户选择。

### 3.2 `body_shape`(体型)
统一枚举:`"hourglass" | "pear" | "apple" | "rectangle" | "inverted_triangle" | "trapezoid" | "triangle" | "oval"`

| 值 | 中文 | 特征 |
|---|---|---|
| hourglass | 沙漏型 | 胸臀相当、腰明显细 |
| pear | 梨型/三角 | 臀明显大于肩胸 |
| apple | 苹果型 | 腰腹最突出 |
| rectangle | 矩形/H型 | 胸腰臀接近、腰线不明显 |
| inverted_triangle | 倒三角 | 肩胸明显大于臀 |
| trapezoid(男) | 梯型 | 肩略宽于腰,匀称 |
| triangle(男) | 三角 | 腰臀宽于肩 |
| oval(男) | 椭圆 | 腰腹突出 |

体型枚举与 `gender_presentation` 解耦；下游可根据商品体系自行映射。无法稳定判断时返回 `null`。

### 3.3 `body_size`(体量)
枚举:`"slim" | "average" | "curvy" | "plus"`
- 不使用 XS/S/M/L(那是服装码,非身材描述)。

### 3.4 `proportions`(比例,序数枚举)
| 子字段 | 枚举 |
|---|---|
| `shoulder_width` | `narrow / average / broad` |
| `waist_definition` | `defined / moderate / straight` |
| `hip_width` | `narrow / average / wide` |
| `leg_to_torso` | `short / balanced / long` |

### 3.5 `skin_tone`(肤色)
枚举:`"fair" | "light" | "medium" | "tan" | "deep"`

### 3.6 `age_range`(年龄段)· **用户输入**
枚举:`"18-25" | "26-35" | "36-45" | "46+"`
- **改为用户输入**:视觉估年龄出错(尤其估老)会让用户不适,故由用户选择。

### 3.7 `extraction`(元信息)
| 子字段 | 类型 | 说明 |
|---|---|---|
| `source_capture_id` | string | 内部拍摄记录 ID |
| `captured_views` | string[] | MVP 固定为 `["front"]` |
| `overall_confidence` | number | 整体置信度 0~1 |
| `field_confidence` | object | 细粒度字段置信度 0~1,供下游降权/回退 |
| `analysis_warnings` | object[] | 画面限制及受影响字段 |

---

## 4. 校验规则

- 单位固定:长度 `cm`,体重 `kg`;数值类型用 number,不带单位字符串。
- 枚举值大小写敏感,使用本文档列出的英文小写值。
- 无法提取或置信度过低的照片字段填 `null`,不要省略键。
- `*_confidence` 取值范围 `[0, 1]`。
- 值为 `null` 时对应字段置信度为 `0`。
- “键必填”只要求结构存在，不要求模型猜出一个值。
- 照片估算的围度和长度不代表裁缝量体结果，不保证真实合身。

---

## 5. 已确认的 MVP 决策

1. 使用单张正面照。
2. 围度均为近似估算，允许返回 `null`。
3. 结果进入下游前允许用户确认和修正。
4. 使用 `source_capture_id`，不在契约中传递永久公开图片 URL。
5. 当前穿搭信息使用独立的 `OUTFIT_PROFILE_CONTRACT.md`。
6. 模块间通过 HTTP API 交付结果。
7. `foot_length_cm` 默认 `null`；鞋码后续由用户输入或单独采集。

---

## 6. 变更记录

- v1.2(2026-06-26):确认单张正面照 MVP；照片字段允许 `null`；细化字段置信度；新增结构化警告；统一体型枚举；使用内部拍摄 ID。
- v1.1(2026-06-21):`gender_presentation`、`age_range` 改为**用户手动输入**(避免视觉误识冒犯用户)。手输项由 2 项增至 4 项(身高/体重/性别/年龄)。
- v1.0(2026-06-21):首版对接契约,从模块设计文档 §2 抽出独立成文。
