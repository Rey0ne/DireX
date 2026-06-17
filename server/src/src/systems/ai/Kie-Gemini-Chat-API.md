# Kie.ai Gemini Chat Completions API

> OpenAI-compatible `POST /v1/chat/completions`

## Authorization

Bearer Token in `Authorization` header:
```
Authorization: Bearer ********************
```

## Body Params (application/json)

### Required

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `messages` | `array[object]` | **Yes** | Array of message objects. Min 1 item. |
| `messages[].role` | `enum<string>` | **Yes** | `developer`, `system`, `user`, `assistant`, `tool` |
| `messages[].content` | `array[oneOf]` | **Yes** | Content array — text strings and/or media objects. |

### Media Format (Unified)

All media files (images, videos, audio, PDFs) use the same structure:
```json
{ "type": "image_url", "image_url": { "url": "https://..." } }
```
- Field `type` is always `"image_url"` (unchanged for all media types)
- Field `image_url.url` points to the media file address

### Optional

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stream` | `boolean` | No | SSE streaming. Default: `true`. |
| `tools` | `array[object]` | No | Tool definitions. Google Search: `{"type": "function", "function": {"name": "googleSearch"}}` |
| `include_thoughts` | `boolean` | No | Include model thoughts in response. Default: `true`. |
| `reasoning_effort` | `enum<string>` | No | `low` (faster) or `high` (more complex). Default: `high`. |

### Example Request

```json
{
  "messages": [
    {
      "role": "system",
      "content": [{ "type": "text", "text": "You are a helpful assistant." }]
    },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Describe this image." },
        { "type": "image_url", "image_url": { "url": "https://example.com/photo.jpg" } }
      ]
    }
  ]
}
```

---

## Response `200` (application/json)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Chat completion ID |
| `object` | `string` | `chat.completion` |
| `created` | `integer<int64>` | Unix timestamp |
| `model` | `string` | Model name, e.g. `gemini-3-pro` |
| `choices` | `array[object]` | Completion choices |
| `choices[].index` | `integer` | Choice index |
| `choices[].message` | `object` | Message content |
| `choices[].finish_reason` | `string` | e.g. `stop` |
| `usage` | `object` | Token usage |
| `usage.prompt_tokens` | `integer` | Prompt tokens |
| `usage.completion_tokens` | `integer` | Completion tokens |
| `usage.total_tokens` | `integer` | Total tokens |

### Example Response

```json
{
  "id": "chatcmpl-example-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gemini-3-pro",
  "choices": [
    {
      "index": 0,
      "message": { "content": "..." },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 50,
    "total_tokens": 60
  }
}
```

---

## Error Responses

| Status | Type | Description |
|--------|------|-------------|
| `400` | `invalid_request_error` | Invalid request parameters |
| `401` | `authentication_error` | Invalid or missing API key |
| `429` | `rate_limit_error` | Too many requests |
| `500` | Server Error | See code list below |

### 500 Error Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `401` | Unauthorized |
| `402` | Insufficient Credits |
| `404` | Not Found |
| `408` | Upstream timeout (>10 min) |
| `422` | Validation Error |
| `429` | Rate Limited |
| `455` | Service Unavailable |
| `500` | Server Error |
| `501` | Generation Failed |
| `505` | Feature Disabled |
