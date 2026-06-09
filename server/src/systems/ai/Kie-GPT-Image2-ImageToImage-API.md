# Kie.ai GPT Image 2 — Image-to-Image API

> `POST /api/v1/jobs/createTask`

## Authorization

Bearer Token in `Authorization` header:
```
Authorization: Bearer ********************
```

## Body Params (application/json)

### Required

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | `enum<string>` | **Yes** | Must be `gpt-image-2-image-to-image` |
| `input` | `object` | **Yes** | Input parameters for the image-to-image task |

### Optional

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callBackUrl` | `string <uri>` | No | Callback URL. Receives POST on task completion. |

---

## `input` Object

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | **Yes** | Text prompt. Max 20,000 characters. |
| `input_urls` | `array[string <uri>]` | **Yes** | Array of input image URLs. **Max 16 items.** |
| `aspect_ratio` | `enum<string>` | No | Default: `auto`. Allowed: `auto`, `1:1`, `3:2`, `2:3`, `4:3`, `3:4`, `5:4`, `4:5`, `16:9`, `9:16`, `2:1`, `1:2`, `3:1`, `1:3`, `21:9`, `9:21` |
| `resolution` | `enum<string>` | No | Allowed: `1K`, `2K`, `4K`. `1:1` cannot be 4K. `auto`/unspecified only 1K. |

### Example

```json
{
  "model": "gpt-image-2-image-to-image",
  "input": {
    "prompt": "Transform this product image into a premium e-commerce poster style.",
    "input_urls": ["https://example.com/reference.jpg"],
    "aspect_ratio": "16:9",
    "resolution": "2K"
  }
}
```

---

## Response `200` (application/json)

| Field | Type | Description |
|-------|------|-------------|
| `code` | `enum<integer>` | Status code |
| `msg` | `string` | Response message |
| `data.taskId` | `string` | Task ID for polling |

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `401` | Unauthorized |
| `402` | Insufficient Credits |
| `404` | Not Found |
| `422` | Validation Error |
| `429` | Rate Limited |
| `433` | Request Limit — sub-key exceeded |
| `455` | Service Unavailable |
| `500` | Server Error |
| `501` | Generation Failed |
| `505` | Feature Disabled |

### Example Response

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "abc123-def456-ghi789"
  }
}
```

---

## Polling

`GET /api/v1/jobs/recordInfo?taskId={taskId}`

When `state` is `succeeded`/`completed`/`success`/`done`, results are in `resultUrls` or `images`.
