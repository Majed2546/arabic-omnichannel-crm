# Message Persistence Layer

This module owns durable message writes for the omnichannel inbox.

## Responsibilities

- Persist incoming WhatsApp messages, outgoing agent messages, system events, and internal notes.
- Update message delivery status: `PENDING`, `SENT`, `DELIVERED`, `READ`, `FAILED`.
- Keep conversation summary fields current:
  - `last_message_preview`
  - `last_message_at`
  - `unread_count`
  - SLA timestamps through `ConversationService`
- Publish realtime events after database commits.
- Enqueue BullMQ jobs for downstream message processing.

## Transaction Boundary

`MessageService.create` wraps message creation and conversation summary updates in a Prisma transaction. Realtime publishing and BullMQ dispatch happen after the transaction returns successfully.

## Tenant Isolation

Every query requires `tenantId`, and write paths validate the conversation belongs to that tenant before inserting messages.

## Debug Endpoints

- `GET /messages/:conversationId`
- `GET /messages/unread-counts`
- `POST /messages`
- `PATCH /messages/:id/status`
- `GET /conversations`
- `GET /conversations/:id`

## WhatsApp Integration

`WhatsAppWebhookService` resolves the WhatsApp channel by `phone_number_id`, then delegates persistence to `MessageService.createIncomingWhatsApp`, which creates or finds the customer and conversation before saving the message.
