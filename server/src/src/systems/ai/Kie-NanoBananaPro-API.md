# Kie.ai Nano Banana Pro API

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
| `model` | `enum<string>` | **Yes** | Must be `nano-banana-pro` |
| `input.prompt` | `string` | **Yes** | Text prompt. Max 10,000 characters. |

### Optional

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callBackUrl` | `string <uri>` | No | Callback URL for task completion. |
| `input` | `object` | No | Input parameters for the generation task. |

---

## `input` Object

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | **Yes** | Text description. Max 10,000 chars. |
| `image_input` | `array[string <uri>]` | No | Input images to transform or use as reference. **Max 8 items.** Accepted: image/jpeg, image/png, image/webp. Max size: 30.0MB per image. |
| `aspect_ratio` | `enum<string>` | No | Default: `1:1`. Allowed: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, `auto` |
| `resolution` | `enum<string>` | No | Default: `1K`. Allowed: `1K`, `2K`, `4K` |
| `output_format` | `enum<string>` | No | Default: `png`. Allowed: `png`, `jpg` |

### Example

```json
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "Comic poster: cool banana hero in shades leaps from sci-fi pad.",
    "image_input": [],
    "aspect_ratio": "1:1",
    "resolution": "1K",
    "output_format": "png"
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

## Error `500` (application/json)

| Field | Type | Description |
|-------|------|-------------|
| `code` | `integer` | Error status code |
| `msg` | `string` | Error description |
| `data` | `object` | |

### Additional Status Code

| Code | Meaning |
|------|---------|
| `408` | Upstream service issues — no result returned for over 10 minutes |

---

## Polling

`GET /api/v1/jobs/recordInfo?taskId={taskId}`
