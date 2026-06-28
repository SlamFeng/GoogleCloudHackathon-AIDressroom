# `outfit_profile` 字段对接说明 · 图像分析 → 穿搭推荐

> 版本：**v1.0**｜日期：2026-06-26  
> 状态：MVP 正式契约  
> 用途：定义信息提取模块从顾客当前全身照中识别出的穿搭信息。  
> 消费方：穿搭推荐 Agent、相似商品检索、试穿预览和推荐解释模块。

---

## 1. 背景与边界

`body_profile` 描述顾客的身体特征，`outfit_profile` 描述顾客在本次拍摄中正在穿着的服装。两者应独立维护。

该契约用于支持：

- 根据顾客当前穿着检索相似商品。
- 判断哪些当前单品可以保留或替换。
- 给 Agent 提供风格、颜色和单品类别观察结果。
- 生成推荐理由。

该契约不负责：

- 判断服装品牌或精确商品 SKU，除非另有商品识别模型提供可靠匹配。
- 判断服装的真实面料成分。
- 判断服装的准确尺码。
- 将风格标签当作对用户身份、职业或性格的判断。

---

## 2. 完整数据结构

```jsonc
{
  "outfit_profile": {
    "schema_version": "1.0",

    "overall_style": [
      "smart_casual"
    ],

    "dominant_colors": [
      {
        "name": "navy",
        "hex": "#24324A",
        "coverage": 0.42
      },
      {
        "name": "white",
        "hex": "#F4F2EC",
        "coverage": 0.25
      }
    ],

    "items": [
      {
        "item_id": "detected_top_1",
        "category": "top",
        "subcategory": "shirt",
        "layer": "inner",
        "colors": [
          {
            "name": "white",
            "hex": "#F4F2EC"
          }
        ],
        "pattern": "solid",
        "fit": "regular",
        "sleeve_length": "long",
        "length": null,
        "material_appearance": ["woven"],
        "style_tags": ["minimal", "smart_casual"],
        "visible": true,
        "confidence": 0.91
      },
      {
        "item_id": "detected_bottom_1",
        "category": "bottom",
        "subcategory": "trousers",
        "layer": "base",
        "colors": [
          {
            "name": "navy",
            "hex": "#24324A"
          }
        ],
        "pattern": "solid",
        "fit": "straight",
        "sleeve_length": null,
        "length": "full",
        "material_appearance": ["woven"],
        "style_tags": ["minimal"],
        "visible": true,
        "confidence": 0.88
      }
    ],

    "styling_observations": {
      "color_palette": "neutral",
      "formality": "smart_casual",
      "silhouette": "balanced",
      "layering": "light"
    },

    "extraction": {
      "source_capture_id": "cap_123",
      "captured_views": ["front"],
      "overall_confidence": 0.86,
      "analysis_warnings": [
        {
          "code": "BODY_PART_CROPPED",
          "affected_items": [],
          "message": "Feet are partially outside the captured frame."
        }
      ]
    },

    "notes": ""
  }
}
```

---

## 3. 字段总表

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `schema_version` | string | ✅ | 固定 `"1.0"` |
| `overall_style` | enum[] | ✅ | 当前穿搭可能同时属于多个风格 |
| `dominant_colors` | object[] | ✅ | 整体主色，按覆盖比例降序 |
| `items` | object[] | ✅ | 检测到的可见单品 |
| `styling_observations` | object | 建议 | 整体搭配观察 |
| `extraction.source_capture_id` | string | ✅ | 引用内部拍摄记录，不使用永久公开图片地址 |
| `extraction.captured_views` | string[] | ✅ | 当前分析使用的视角 |
| `extraction.overall_confidence` | number | ✅ | 整体置信度，范围 `[0, 1]` |
| `extraction.analysis_warnings` | object[] | ✅ | 结构化不确定性和画面限制；无警告时为 `[]` |
| `notes` | string | 选填 | 系统补充说明 |

---

## 4. 单品结构

### 4.1 `category`

一级类别枚举：

```text
outerwear
top
bottom
dress
one_piece
shoes
headwear
bag
accessory
unknown
```

说明：

- 连衣裙使用 `dress`。
- 连体裤等非连衣裙一体式服装使用 `one_piece`。
- 无法稳定判断时使用 `unknown`，不要强行分类。

### 4.2 `subcategory`

`subcategory` 使用开放字符串，以便商品数据库逐步扩展。MVP 推荐值：

| category | 推荐 subcategory |
|---|---|
| `outerwear` | `jacket`, `coat`, `blazer`, `cardigan`, `hoodie` |
| `top` | `t_shirt`, `shirt`, `blouse`, `sweater`, `tank_top`, `polo` |
| `bottom` | `jeans`, `trousers`, `chinos`, `shorts`, `skirt`, `leggings` |
| `dress` | `casual_dress`, `formal_dress`, `shirt_dress` |
| `one_piece` | `jumpsuit`, `romper`, `overall` |
| `shoes` | `sneakers`, `boots`, `loafers`, `heels`, `sandals`, `flats` |
| `headwear` | `cap`, `hat`, `beanie` |
| `bag` | `backpack`, `tote`, `shoulder_bag`, `handbag`, `crossbody` |
| `accessory` | `scarf`, `belt`, `necklace`, `tie`, `glasses`, `watch` |

不在推荐值内时可以返回其他英文小写 `snake_case` 字符串。

### 4.3 `layer`

枚举：

```text
base
inner
mid
outer
accessory
unknown
```

该字段帮助 Agent 判断替换某件服装时是否影响其他层。

### 4.4 `colors`

每件单品最多返回三个主要颜色：

```jsonc
{
  "name": "navy",
  "hex": "#24324A"
}
```

- `name` 使用 §6.2 的标准颜色枚举。
- `hex` 是画面中的近似显示色，不代表商品官方色号。

### 4.5 `pattern`

枚举：

```text
solid
striped
checked
plaid
floral
polka_dot
graphic
animal
camouflage
abstract
color_block
other
unknown
```

### 4.6 `fit`

枚举：

```text
slim
regular
relaxed
oversized
straight
wide
unknown
```

这里描述视觉上的服装轮廓，不代表实际尺码或是否合身。

### 4.7 长度字段

上装可使用：

```text
sleeveless
short
elbow
three_quarter
long
unknown
```

下装、裙装或连体服装可使用：

```text
mini
above_knee
knee
midi
ankle
full
unknown
```

不适用的长度字段填写 `null`。

### 4.8 `material_appearance`

视觉材质观感枚举：

```text
denim
knit
woven
leather_like
suede_like
silk_like
linen_like
fleece
sheer
quilted
other
unknown
```

字段名刻意使用 `appearance`：模型只能描述视觉观感，不能确认真实纤维成分。

### 4.9 `visible`

- `true`：单品有足够可见区域支持分析。
- `false`：根据局部线索推断存在，但大部分被遮挡。

当 `visible` 为 `false` 时，应降低该单品 `confidence` 并添加警告。

---

## 5. 分析警告

结构：

```jsonc
{
  "code": "ITEM_OCCLUDED",
  "affected_items": ["detected_shoes_1"],
  "message": "Shoes are partially occluded."
}
```

推荐代码：

```text
LOW_LIGHT
OVEREXPOSED
MOTION_BLUR
BODY_PART_CROPPED
MULTIPLE_PEOPLE
ITEM_OCCLUDED
COLOR_UNCERTAIN
CATEGORY_UNCERTAIN
MATERIAL_UNCERTAIN
LOW_MODEL_CONFIDENCE
```

- `affected_items` 填受影响的 `item_id`。
- 警告影响整体而非具体单品时，`affected_items` 使用空数组 `[]`。
- `message` 用于日志和调试，前端应根据 `code` 显示本地化文案。

---

## 6. 整体风格与颜色

### 6.1 `overall_style`

MVP 枚举：

```text
casual
smart_casual
formal
business
minimal
streetwear
sporty
athleisure
classic
preppy
romantic
bohemian
vintage
workwear
outdoor
avant_garde
other
unknown
```

规则：

- 可以返回 1 到 3 个值。
- 不确定时返回 `["unknown"]`。
- 风格只是当前服装的标签，不应表述为用户的固定人格或身份。

### 6.2 标准颜色名称

MVP 标准颜色枚举：

```text
black
white
gray
silver
brown
beige
cream
red
orange
yellow
green
olive
blue
navy
purple
pink
gold
multicolor
unknown
```

商品检索优先使用标准名称；`hex` 主要用于 UI 展示和相似色排序。

### 6.3 `styling_observations`

#### `color_palette`

```text
neutral
warm
cool
earthy
pastel
bright
dark
monochrome
mixed
unknown
```

#### `formality`

```text
casual
smart_casual
business
formal
unknown
```

#### `silhouette`

```text
fitted
balanced
relaxed
oversized
top_heavy
bottom_heavy
unknown
```

该字段只描述服装形成的整体轮廓，不描述身体。

#### `layering`

```text
none
light
moderate
heavy
unknown
```

---

## 7. 校验规则

- 所有枚举大小写敏感，使用英文小写值。
- 无法判断的枚举字段使用 `"unknown"`。
- 不适用但结构固定的字段使用 `null`。
- 数组无法提取时使用空数组 `[]`，不要省略键。
- `confidence` 和 `coverage` 范围固定为 `[0, 1]`。
- `dominant_colors[*].coverage` 总和可以小于 1，但不能大于 1。
- `item_id` 在一次分析结果内必须唯一。
- 单张图中，同一件服装不要按可见碎片重复输出。
- 不应凭图片猜测品牌、价格、SKU 或真实面料成分。
- 结构化结果必须在后端通过 Schema 校验后交付下游。

---

## 8. 与推荐模块的使用约定

推荐 Agent 可以将字段用于：

- 使用 `items.category` 和 `subcategory` 查询同类商品。
- 使用颜色、风格和图案检索相似商品。
- 使用 `layer` 判断替换依赖。
- 使用 `confidence` 对低置信度观察降权。
- 根据 `analysis_warnings` 决定是否询问用户。

推荐 Agent 不应：

- 将低置信度字段视为硬约束。
- 仅凭当前穿搭推断用户长期偏好。
- 因当前未检测到某类单品而断言用户不喜欢该类别。
- 使用 `hex` 精确匹配商品官方色号。

---

## 9. MVP 最小输出

为了降低首轮对接成本，MVP 至少稳定提供：

```jsonc
{
  "outfit_profile": {
    "schema_version": "1.0",
    "overall_style": ["casual"],
    "dominant_colors": [
      {
        "name": "blue",
        "hex": "#34547A",
        "coverage": 0.4
      }
    ],
    "items": [
      {
        "item_id": "detected_top_1",
        "category": "top",
        "subcategory": "t_shirt",
        "layer": "base",
        "colors": [
          {
            "name": "white",
            "hex": "#F4F2EC"
          }
        ],
        "pattern": "solid",
        "fit": "regular",
        "sleeve_length": "short",
        "length": null,
        "material_appearance": ["woven"],
        "style_tags": ["casual"],
        "visible": true,
        "confidence": 0.9
      }
    ],
    "styling_observations": {
      "color_palette": "neutral",
      "formality": "casual",
      "silhouette": "balanced",
      "layering": "none"
    },
    "extraction": {
      "source_capture_id": "cap_123",
      "captured_views": ["front"],
      "overall_confidence": 0.85,
      "analysis_warnings": []
    },
    "notes": ""
  }
}
```

---

## 10. 已确认的 MVP 决策

1. 与 `body_profile` 分开维护。
2. 使用固定风格与颜色枚举，便于库存检索。
3. 保留鞋、包、帽子和配饰类别，但模型未检测到时不补空单品。
4. “建议保留/建议替换”由推荐 Agent 决策，不由视觉模块输出。
5. 不在首版结果中保存单品裁剪图。
6. 保留近似 `hex`，用于 UI 展示和相似色排序。

---

## 11. 变更记录

- v1.0（2026-06-26）：团队确认单张正面照、HTTP API 和独立穿搭契约，转为 MVP 正式版本。
