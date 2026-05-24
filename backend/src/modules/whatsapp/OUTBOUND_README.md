# Outgoing WhatsApp Sending Engine

This engine sends WhatsApp messages through Meta Cloud API while preserving durable inbox state.

## Endpoints

- `POST /whatsapp/send`
- `POST /whatsapp/send/test`

Request body:

```json
{
  "tenantId": "tenant-id",
  "conversationId": "conversation-id",
  "recipient": "966555000000",
  "message": "مرحبا من أومني تشات",
  "messageType": "text"
}
```

Supported `messageType` values:

- `text`
- `template`
- `image`
- `document`

## Flow

1. `WhatsAppSendService` verifies the conversation belongs to the tenant and uses its WhatsApp channel.
2. A pending outgoing message is persisted before network delivery.
3. A `whatsapp-outbound` BullMQ job is enqueued with exponential retries.
4. `WhatsAppOutboundQueue` processes the job through `WhatsAppMessageDispatcher`.
5. The dispatcher calls Meta Cloud API or simulates the call for `/send/test`.
6. Message status is updated to `SENT` or `FAILED`.
7. Realtime events are published:
   - `message.created`
   - `message.updated`
   - `notification.created`

## Rate Limit Safety

The outbound queue uses a BullMQ limiter to keep provider calls controlled. Per-number and per-tenant throttling can be added by splitting queue groups or using BullMQ group keys in a future upgrade.

## Error Handling

Meta API errors are mapped into provider-safe categories:

- `invalid_token`
- `rate_limit`
- `blocked_recipient`
- `template_error`
- `unknown`

Webhook delivery callbacks continue to update statuses via `WhatsAppWebhookService` and `MessageService.updateStatusByExternalId`.
