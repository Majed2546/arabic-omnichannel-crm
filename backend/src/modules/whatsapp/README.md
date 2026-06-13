# WhatsApp Webhook Engine

Production-oriented ingestion foundation for Meta WhatsApp Cloud API webhooks.

## Endpoints

- `GET /webhooks/whatsapp`: Meta verification using `hub.mode`, `hub.verify_token`, and `hub.challenge`
- `POST /webhooks/whatsapp`: Incoming webhook ingestion
- `GET /webhooks/whatsapp/diagnostics`: Recent webhook processing diagnostics
- `GET /whatsapp/status`: WhatsApp module status

## Pipeline

1. Controller receives the webhook and validates the verification token or accepts POST payloads.
2. Signature validation placeholder checks the expected header shape and is ready for raw-body enforcement.
3. Raw payload is queued to `whatsapp-webhooks` with retry-safe job IDs.
4. Supported changes are parsed into internal events:
   - `message.received`
   - `message.status`
   - `template.status`
   - `conversation.started`
5. `WhatsAppMessageMapper` normalizes message types: text, image, audio, document, template, reaction.
6. Message jobs are queued to `whatsapp-messages`.
7. `WhatsAppEventPublisher` emits realtime events:
   - `message.created`
   - `conversation.created`
   - `notification.created`

## Tenant And Channel Resolution

The current resolver maps `metadata.phone_number_id` to deterministic placeholder IDs:

- `tenant:{phone_number_id}`
- `whatsapp:{phone_number_id}`

This keeps the engine multi-number ready. In production this resolver should query `Channel` by tenant and provider phone number ID.

## Future Hooks

- Persist `Customer`, `Conversation`, and `Message` records through Prisma.
- Enforce Meta `x-hub-signature-256` with raw request body.
- Download and scan media payloads.
- Synchronize template status events into template tables.
- Feed BullMQ processors for message enrichment and automation.
