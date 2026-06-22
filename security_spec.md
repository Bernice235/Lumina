# Security Specification for Lumina

## Data Invariants
- A user document must have a matching `id` with their Auth `uid`.
- A user can only read their own document or their partner's document (if linked).
- A gift can only be created by a user for their linked partner.
- An invite can only be deleted by the recipient (the partner accepting it) or the sender.
- Immutable fields: `id`, `email`, `createdAt` (on invites and gifts).

## The Dirty Dozen Payloads
1. Attempt to create a user profile with a different UID.
2. Attempt to update another user's cycle data without being their partner.
3. Attempt to set `partnerId` to a user who hasn't sent an invite.
4. Attempt to send a gift to a random user who is not a linked partner.
5. Attempt to create an invite for another user.
6. Attempt to delete an invite the user didn't send or receive.
7. Attempt to inject a 1MB string into the `name` field.
8. Attempt to update `email` field after creation.
9. Attempt to read a user's private notes without being the owner.
10. Attempt to list all users.
11. Attempt to create a gift with a future timestamp.
12. Attempt to bypass `isPartner` check during signup.

## Red Team Analysis
The rules must check:
- `request.auth.uid == userId` for ownership.
- `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.partnerId == userId` for partner read access.
- `incoming().keys().hasAll(...)` and `size()` for strict schema.
- `isValidId(userId)` for path hardening.
