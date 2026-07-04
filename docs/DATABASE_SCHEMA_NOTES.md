# Database Schema Notes

Status: planning notes, not final migrations.

The first version should avoid long-term customer profiles. Use `session_id` as the dynamic data center.

## 1. Scope Boundary

This file documents shared table expectations so teams can align. It is not a final SQL schema.

| Table Area | Owner | Agent Dependency |
|---|---|---|
| Product tables | Inventory/product | Read through product/recommendation tools |
| Session tables | Agent/backend | Read/write |
| Face profile table | Image/try-on + Agent | Consent branch and generation handoff |
| Generated image table | Image/try-on | Agent reads status/result |

## 2. Product-Side Tables

### 2.1 `products`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `product_id` | string | yes | Stable identifier |
| `sku` | string | optional | Store SKU |
| `name` | string | yes | Product display name |
| `category` | enum/string | yes | top, bottom, dress, outerwear, shoes, accessory |
| `price` | number | yes | Use JPY in MVP |
| `currency` | string | yes | Default `JPY` |
| `fabric` | string | optional | Details display |
| `color` | string | yes | Main color |
| `size_list` | string[] | optional | Display availability summary |
| `style_tags` | string[] | optional | Must align with analysis style vocabulary |
| `body_fit_tags` | string[] | optional | Body template fit tags |
| `is_seasonal` | boolean | optional | Seasonal/hot set |
| `created_at` | timestamp | optional | Listing time |

### 2.2 `inventory`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `inventory_id` | string | yes | Stable identifier |
| `product_id` | string | yes | Product reference |
| `size` | string | yes | Size variant |
| `color` | string | yes | Color variant |
| `quantity` | number | yes | Current count |
| `store_id` | string | yes | Store reference |

Recommendation tools should avoid out-of-stock products.

### 2.3 `product_images`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `image_id` | string | yes | Stable identifier |
| `product_id` | string | yes | Product reference |
| `image_url` | string | yes | Public or signed URL |
| `image_type` | enum | optional | main, detail, flat_lay, base |
| `sort_order` | number | optional | Display order |

## 3. Agent-Side Tables

### 3.1 `sessions`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `session_id` | string | yes | Dynamic data root |
| `scene_type` | enum | yes | mirror, storefront_screen, staff_ipad |
| `store_id` | string | yes | Store reference |
| `status` | enum | yes | analyzing, communicating, recommending, refining, confirmed, ended |
| `route` | enum | optional | explicit, recommendation, unclear |
| `started_at` | timestamp | yes | Start time |
| `ended_at` | timestamp | optional | End time |

### 3.2 `analysis_results`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `analysis_id` | string | yes | Stable identifier |
| `session_id` | string | yes | Session reference |
| `matched_body_template_id` | string | yes | Body template, not exact measurement |
| `current_style` | string[] | yes | Shared style vocabulary |
| `photo_url` | string | optional | Prefer expiring URL |
| `confidence` | number | yes | 0-1 |
| `created_at` | timestamp | yes | Analysis time |

### 3.3 `session_face_profiles`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `face_profile_id` | string | yes | Stable identifier |
| `session_id` | string | yes | Session reference |
| `consent_given` | boolean | yes | Explicit real-face consent |
| `face_mode` | enum | yes | real_face, default_face |
| `face_data_encrypted` | encrypted blob | conditional | Only when consent granted |
| `default_face_template_id` | string | conditional | Required when consent denied |
| `match_basis` | string | optional | Why default face was selected |
| `expire_at` | timestamp | optional | Required for real-face profile in production |
| `created_at` | timestamp | yes | Created time |

Policy:

- Do not create real face profile if consent is denied.
- Do not store exact body measurement data.
- Prefer deletion/expiry for raw photos and real-face data.

### 3.4 `recommendation_sets`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `set_id` | string | yes | Recommendation set ID |
| `session_id` | string | yes | Session reference |
| `round` | number | yes | Feedback loop round |
| `rec_type` | enum | yes | similar, style, seasonal, explicit_need |
| `product_combo` | string[] | yes | Product IDs |
| `reason` | string | optional | Display reason |
| `created_at` | timestamp | yes | Created time |

### 3.5 `feedbacks`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `feedback_id` | string | yes | Feedback ID |
| `set_id` | string | yes | Target set |
| `session_id` | string | yes | Session reference |
| `feedback_type` | enum | yes | reject_all, partial_adjust, positive_keep, confirm |
| `dimension` | enum | optional | color, fit, style, price, overall |
| `dimension_value` | string | optional | Specific value |
| `raw_voice_text` | string | optional | STT transcript |
| `parsed_intent` | object | optional | Parsed feedback |
| `created_at` | timestamp | yes | Created time |

### 3.6 `generated_images`

| Field | Type Hint | Required | Notes |
|---|---|---|---|
| `image_id` | string | yes | Generated image record |
| `session_id` | string | yes | Session reference |
| `set_id` | string | yes | Recommendation set |
| `product_combo` | string[] | yes | Product IDs |
| `base_template_id` | string | yes | Body template |
| `face_mode` | enum | yes | real_face, default_face |
| `result_url` | string | optional | Available on success |
| `status` | enum | yes | pending, success, failed, retrying |
| `created_at` | timestamp | yes | Created time |

## 4. Index/Query Notes

Likely useful indexes:

- `sessions(store_id, started_at)`
- `analysis_results(session_id)`
- `session_face_profiles(session_id)`
- `recommendation_sets(session_id, round)`
- `feedbacks(session_id, created_at)`
- `generated_images(session_id, set_id)`
- `inventory(store_id, product_id, size, color)`
- `products(category)`

## 5. Open Questions

- Does the inventory team need variant-level `product_id` or separate SKU variant IDs?
- Does recommendation need `stock_quantity` or only `in_stock`?
- Should `style_tags` be a fixed enum or free tag list in the MVP?
- Who owns deletion jobs for `photo_url` and `face_data_encrypted`?
- Does storefront screen need shorter session expiry than mirror/iPad?
