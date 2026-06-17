# Kie.ai GPT Image 2 — Text-to-Image API

> `POST /api/v1/jobs/createTask`

## Body Params (application/json)

### Required

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | `enum<string>` | **Yes** | Model name. Must be `gpt-image-2-text-to-image` |
| `input` | `object` | **Yes** | Input parameters for the generation task |

### Optional

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `callBackUrl` | `string <uri>` | No | Callback URL for task completion notifications. Receives POST on success/failure. If omitted, poll via Get Task Details endpoint. |

---

## `input` Object

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | **Yes** | Text prompt. Max 20,000 characters, min 1 character. |
| `aspect_ratio` | `enum<string>` | No | Default: `auto`. Allowed: `auto`, `1:1`, `3:2`, `2:3`, `4:3`, `3:4`, `5:4`, `4:5`, `16:9`, `9:16`, `2:1`, `1:2`, `3:1`, `1:3`, `21:9`, `9:21` |
| `resolution` | `enum<string>` | No | Allowed: `1K`, `2K`, `4K`. Note: `1:1` aspect cannot be 4K. `auto` aspect (or unspecified) only supports 1K. |

### Example

```json
{
  "model": "gpt-image-2-text-to-image",
  "input": {
    "prompt": "A cinematic night city poster with neon reflections on a rainy street.",
    "aspect_ratio": "16:9",
    "resolution": "2K"
  }
}
```

---

## Response `200` (application/json)

| Field | Type | Description |
|-------|------|-------------|
| `code` | `enum<integer>` | Status code (see below) |
| `msg` | `string` | Response message, error description when failed |
| `data.taskId` | `string` | Task ID — use with Get Task Details endpoint to poll status |

### Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success — request processed |
| `401` | Unauthorized — missing/invalid credentials |
| `402` | Insufficient Credits |
| `404` | Not Found — endpoint/resource doesn't exist |
| `422` | Validation Error — parameters failed validation |
| `429` | Rate Limited |
| `433` | Request Limit — sub-key usage exceeds limit |
| `455` | Service Unavailable — maintenance |
| `500` | Server Error — unexpected |
| `501` | Generation Failed — content generation task failed |
| `505` | Feature Disabled — feature currently disabled |

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

After task creation, poll the task status via:

`GET /api/v1/jobs/recordInfo?taskId={taskId}`

When `state` is `succeeded`/`completed`/`success`/`done`, the result contains `resultUrls` or `images` with the generated asset URLs.
