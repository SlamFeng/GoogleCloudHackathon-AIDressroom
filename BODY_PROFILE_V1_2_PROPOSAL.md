# `body_profile` v1.2 兼容修订提案

> 日期：2026-06-26  
> 状态：已采纳；正式版本见 `BODY_PROFILE_CONTRACT.md` v1.2 与 `schemas/body-profile.schema.json`  
> 目标：解决 v1.1 中“照片字段必填”与“无法提取时为 `null`”的冲突，并避免把视觉估算误用为精确人体测量。

## 1. 建议保持不变

以下字段继续由用户输入，并保持必填：

```text
height_cm
weight_kg
gender_presentation
age_range
```

以下约定继续保持：

- 长度单位使用 `cm`。
- 体重单位使用 `kg`。
- 枚举使用英文小写值。
- 输出保留 `schema_version`。
- 提供提取置信度和来源信息。

## 2. 建议修改

### 2.1 照片字段允许 `null`

以下字段在画面不足、遮挡严重或置信度低于阈值时应返回 `null`：

```text
body_shape
body_size
proportions.*
measurements.*
skin_tone
```

键仍然保留，从而保持消费者端结构稳定。

### 2.2 测量值明确为估算

保留现有 `measurements` 名称以避免破坏下游，但在契约中明确：

> 所有从普通照片提取的围度和长度均为视觉估算值，不代表裁缝量体结果，也不应直接用于保证服装真实合身。

### 2.3 细化字段置信度

建议从：

```jsonc
{
  "field_confidence": {
    "measurements": 0.70
  }
}
```

升级为：

```jsonc
{
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
      "bust_cm": 0.42,
      "waist_cm": 0.38,
      "hip_cm": 0.45,
      "shoulder_cm": 0.69,
      "inseam_cm": 0.73,
      "foot_length_cm": 0.0
    },
    "skin_tone": 0.61
  }
}
```

字段为 `null` 时，对应置信度建议为 `0`。

### 2.4 增加分析警告

```jsonc
{
  "analysis_warnings": [
    {
      "code": "LOOSE_CLOTHING",
      "affected_fields": [
        "body_shape",
        "proportions.waist_definition",
        "measurements.bust_cm",
        "measurements.waist_cm"
      ],
      "message": "Loose clothing reduces body contour accuracy."
    }
  ]
}
```

推荐警告代码：

```text
LOW_LIGHT
OVEREXPOSED
MOTION_BLUR
BODY_PART_CROPPED
POSE_NOT_FRONTAL
LOOSE_CLOTHING
HEAVY_OUTERWEAR
BODY_OCCLUDED
FEET_NOT_VISIBLE
MULTIPLE_PEOPLE
SINGLE_VIEW_LIMITATION
LOW_MODEL_CONFIDENCE
```

### 2.5 图片引用改为内部拍摄 ID

建议将：

```text
source_image_url
```

替换或补充为：

```text
source_capture_id
```

如果下游必须访问图片，则由服务端按授权临时生成短期签名 URL。契约中不保存永久公开 URL。

### 2.6 明确 `neutral` 的体型枚举

建议采用统一枚举，而不是根据 `gender_presentation` 切换两套互斥枚举：

```text
hourglass
pear
apple
rectangle
inverted_triangle
trapezoid
triangle
oval
unknown
```

由模型选择最接近的轮廓类别，推荐模块自行决定该类别在对应商品体系中的使用方式。

好处：

- `neutral` 不需要额外分支。
- 更容易做 JSON Schema 校验。
- 用户修正时不因性别呈现改变可选值。
- 下游可以按自身尺码体系映射。

如果团队坚持男女两套枚举，则必须补充 `neutral` 的明确规则。

## 3. 建议的数据结构

```jsonc
{
  "body_profile": {
    "schema_version": "1.2",

    "height_cm": 168,
    "weight_kg": 58,
    "gender_presentation": "female",
    "age_range": "26-35",

    "body_shape": "hourglass",
    "body_size": "average",

    "proportions": {
      "shoulder_width": "average",
      "waist_definition": "defined",
      "hip_width": "average",
      "leg_to_torso": "balanced"
    },

    "measurements": {
      "bust_cm": null,
      "waist_cm": null,
      "hip_cm": null,
      "shoulder_cm": 39,
      "inseam_cm": 76,
      "foot_length_cm": null
    },

    "skin_tone": "light",

    "extraction": {
      "source_capture_id": "cap_123",
      "captured_views": ["front"],
      "overall_confidence": 0.76,
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

    "notes": ""
  }
}
```

## 4. 推荐的必填规则

“必填”应表示键必须存在，而不表示照片模型必须猜出一个值。

| 字段 | 键必填 | 值允许 `null` |
|---|---:|---:|
| `schema_version` | ✅ | ❌ |
| 四项用户输入 | ✅ | ❌ |
| `body_shape` | ✅ | ✅ |
| `body_size` | ✅ | ✅ |
| `proportions.*` | ✅ | ✅ |
| `measurements.*` | ✅ | ✅ |
| `skin_tone` | ✅ | ✅ |
| `extraction.source_capture_id` | ✅ | ❌ |
| `extraction.captured_views` | ✅ | ❌ |
| `extraction.overall_confidence` | ✅ | ❌ |
| `extraction.field_confidence` | ✅ | ❌ |
| `extraction.analysis_warnings` | ✅ | ❌ |
| `notes` | ✅ | ❌ |

## 5. 置信度使用建议

建议将阈值作为服务端配置：

| 置信度 | 建议行为 |
|---:|---|
| `>= 0.80` | 可以直接用于软推荐条件 |
| `0.60–0.79` | 可使用，但在 UI 中允许用户确认 |
| `0.40–0.59` | 只作为弱提示，不作为筛选条件 |
| `< 0.40` | 字段返回 `null` 或触发重新拍摄/询问 |

置信度不是准确率保证。团队后续应使用固定测试图片集校准这些阈值。

## 6. 兼容策略

若下游已经按 v1.0 开发，可采用：

1. API 请求中允许消费者指定 `schema_version`。
2. 服务端内部统一使用 v1.2。
3. 返回 v1.0 时：
   - 保留原有字段。
   - 将细粒度置信度聚合成旧格式。
   - 无法提取的字段继续返回 `null`。
4. 不再为满足旧“必填值”要求而生成虚假默认值。

## 7. 团队需要拍板的事项

1. 是否接受照片提取字段值为 `null`？
2. 是否接受统一 `body_shape` 枚举？
3. 下游能否消费细粒度 `field_confidence`？
4. 是否用 `source_capture_id` 取代 `source_image_url`？
5. 围度低置信度时，是返回 `null` 还是仍返回估算值并附警告？
6. `skin_tone` 是否确实对试穿生成有价值？若价值不明确，建议从用户可见 UI 中移除。
