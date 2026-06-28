# Analysis schemas

这些文件是图像采集与分析模块的 MVP 正式机器契约。

| 文件 | 用途 |
|---|---|
| `body-profile.schema.json` | `body_profile` v1.2 的 JSON Schema |
| `outfit-profile.schema.json` | `outfit_profile` v1.0 的 JSON Schema |
| `analysis-handoff.schema.json` | 图像分析模块完整交付对象的 JSON Schema |
| `analysis-handoff.example.json` | 图像分析模块交给推荐 Agent 的联合样例 |

后续变更应：

1. 升级对应版本号。
2. 在 API 请求、Gemini 结构化输出和 CI 中使用同一份 Schema。
3. 保留向后兼容策略或明确迁移说明。
4. 为有效、缺字段、非法枚举、置信度越界和额外字段编写测试。
