# Kie.ai GPT-5 API

## Authorization

Bearer Token in `Authorization` header:
```
Authorization: Bearer ********************
```

## Body Params (application/json)

### Required

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | `enum<string>` | **Yes** | Must be `gpt-5-5` |
| `input` | `string` or `array[InputMessage]` | **Yes** | Text string or message array. |

### Optional

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stream` | `boolean` | No | SSE streaming. Default: `false`. |
| `reasoning` | `object` | No | Reasoning configuration. |
| `reasoning.effort` | `enum<string>` | No | `low` (default), `medium`, `high`, `xhigh` |
| `tools` | `array[oneOf]` | No | `ToolWebSearch` or `ToolFunction`. Cannot use both simultaneously. |
| `tool_choice` | `string` | No | When function tools configured, set to `auto` for model to decide. |

### Tools

**Web Search:**
```json
{ "type": "web_search" }
```

**Function Calling:**
```json
{
  "type": "function",
  "function": {
    "name": "...",
    "description": "...",
    "parameters": {}
  }
}
```

### Example

```json
{
  "model": "gpt-5-5",
  "input": "Explain quantum computing in simple terms.",
  "stream": false,
  "reasoning": { "effort": "medium" }
}
```

---

## Response `200` (text/event-stream)

SSE (Server-Sent Events) envelope structure.

| Field | Type | Description |
|-------|------|-------------|
| `output` | `array[object]` | Response output array |
| `output[].type` | `string` | Output type |
| `output[].id` | `string` | Output ID |
| `output[].summary` | `array[string]` | Summary text (optional) |
| `output[].role` | `string` | Message role (optional) |
| `output[].content` | `array[object]` | Content blocks (optional) |
| `output[].status` | `string` | Output status (optional) |
| `usage` | `object` | Token usage |
| `usage.input_tokens` | `integer` | Input tokens |
| `usage.output_tokens` | `integer` | Output tokens |
| `usage.total_tokens` | `integer` | Total tokens |
| `usage.credits_consumed` | `number` | Credits consumed |
| `usage.input_tokens_details` | `object` | Token details (optional) |
| `status` | `string` | Request status |

---

## Error Responses

| Status | Type | Description |
|--------|------|-------------|
| `400` | `invalid_request_error` | Invalid request parameters |
| `401` | `authentication_error` | Invalid or missing API key |
| `429` | `rate_limit_error` | Too many requests |
| `500` | Server Error | See response body for details |
