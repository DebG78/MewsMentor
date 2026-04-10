# Pair Messaging — Design Spec

**Date:** 2026-04-10
**Status:** Approved

## Problem

There is no way to send a Slack DM to a specific matched mentor-mentee pair. Messages either go to all pairs in a cohort or to manually selected individuals. An admin needs to be able to pick one or more pairs and send the same message to both people in each pair.

## Solution

Two entry points, one send flow:

1. **New audience source in Compose & Send** — "Matched pairs in cohort"
2. **"Message Pair" button on MatchBoard** — navigates to Compose & Send with the pair pre-selected

### 1. Compose & Send: "Matched pairs in cohort" audience source

Add a 4th `AudienceSource` value: `cohort_pairs`.

**Behavior:**
- User selects a cohort (same cohort picker as existing sources)
- The participant list shows **pairs** instead of individuals — each row displays both names, e.g. "Alice (mentee) + Bob (mentor)"
- Checkboxes select/deselect entire pairs (both people are included)
- Multi-select is supported
- Pairs without Slack IDs on either person are flagged (same amber warning pattern as today)

**Data source:** `getMatchedPairsWithPhase(cohortId)` from `messageService.ts` — already returns `{ mentee: Participant, mentor: Participant }` pairs.

**Sending:** For each selected pair, create two `BulkRecipient` entries (one for the mentee, one for the mentor) using `buildParticipantContext()` for each. Pass to the existing `sendBulkMessages()` function. No new edge function needed.

**Templates & placeholders:** Same message sent to both people. Standard individual placeholders (`{FIRST_NAME}`, `{COHORT_NAME}`, etc.) are resolved per-person. Pair-aware placeholders (`{MENTOR_FIRST_NAME}`, etc.) are not supported in this flow — can be added later if personalized-per-role messages are needed.

### 2. MatchBoard: "Message Pair" button

Add a small message/send icon button on each **approved** pair card in the MatchBoard Kanban view. Not shown on pending pairs.

**Behavior:**
- Clicking navigates to `/admin/settings?tab=messages&pairMenteeId=<id>&pairMentorId=<id>&cohortId=<id>`
- ComposeAndSend reads these URL query params on mount
- Auto-selects "Matched pairs in cohort" as the audience source
- Sets the cohort and pre-selects the specific pair
- User can add more pairs, compose a message, and send

### 3. Out of scope

- Pair-specific placeholders (e.g. `{MENTOR_FIRST_NAME}`) in bulk pair messages — standard individual placeholders only
- New edge function — reuses `send-bulk-messages`
- New template type — uses existing template picker and ad-hoc compose
- Personalized per-role messages (different message to mentee vs mentor) — same message to both

## Files to modify

| File | Change |
|------|--------|
| `src/components/admin/ComposeAndSend.tsx` | Add `cohort_pairs` audience source, pair-based participant list, URL param reading for pre-selection |
| `src/lib/messageService.ts` | No changes needed — `getMatchedPairsWithPhase()` already exists |
| `src/components/admin/MatchBoard.tsx` | Add message icon button on approved pair cards, navigation to Compose & Send with query params |

## Data flow

```
MatchBoard "Message Pair" click
  → navigate to /admin/settings?tab=messages&pairMenteeId=X&pairMentorId=Y&cohortId=Z

ComposeAndSend (audience = cohort_pairs)
  → getMatchedPairsWithPhase(cohortId)
  → display pairs with checkboxes
  → on send: flatten selected pairs into BulkRecipient[] (2 entries per pair)
  → sendBulkMessages() → send-bulk-messages edge function → Zapier → Slack DMs
```
