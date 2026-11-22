# Security Specification for Lumina: Bloom & Balance

## Data Invariants
- A user profile document `/users/{userId}` must have `id == userId == request.auth.uid`.
- Blanket listing of `/users` or unauthenticated reads of any user, notification, invite, or telemetry collection is strictly prohibited.
- Partner reads of `/users/{userId}` require mutual link (`isPartnerOf(userId)`), and non-owner updates to `/users/{userId}` are strictly partitioned into narrow action branches:
  1. Pending Partner Connection initiation (only when `!existing().get('isPartnerLinked', false)` and writing strictly `['partnerId', 'partnerName', 'isPartnerLinked', 'partnerRequest', 'notifications']` with `partnerId == request.auth.uid`).
  2. Linked Partner Disconnect (only `['partnerId', 'partnerName', 'isPartnerLinked']` resetting `partnerId == null` and `isPartnerLinked == false`).
  3. Linked Partner Notification Append (only `['notifications']` with bounded list size `<= 150`).
- Partners and strangers can NEVER modify `id`, `email`, `cycleLength`, `periodLength`, `periods`, `diaryEntries`, `securitySettings`, `privacyPreferences`, `sharingSettings`, or `referralCount`.
- Gifts under `/users/{userId}/gifts/{giftId}` enforce `senderId == request.auth.uid`, valid gift type enum, valid parent user existence (`exists()`), and allow reads only to the receiving owner (`userId`).
- `/partner_requests/{requestId}` can only be read, listed, updated, or deleted by `user_id` or `partner_id`; recipients may only transition `status` (`approved` / `declined`); immutable once terminal? Wait: recipient transitions `pending -> approved|declined`.
- `/notifications/{notificationId}` may only be created by `senderId == request.auth.uid` and read/updated/deleted strictly by `recipientId == request.auth.uid` or `senderId == request.auth.uid`.
- `/global_config/{configId}` is readable only by authenticated users and NEVER writable from client SDKs (`allow write: if false;`).
- `/analytics_events/{eventId}` and `/crash_reports/{reportId}` enforce `userId == request.auth.uid` on both creation and queries (`allow get, list`).

## The Dirty Dozen Attack Payloads (Must All Yield PERMISSION_DENIED)
1. **Identity Spoofing on User Create**: `create /users/victim_uid` with `{ id: "victim_uid", name: "Attacker", email: "a@b.com" }` signed in as `attacker_uid`.
2. **User Enumeration**: `list /users` as any signed-in or anonymous user.
3. **Privilege / Sharing Tampering via Shadow Update**: `update /users/victim_uid` by another signed-in user adding `sharingSettings` or `referralCount` or `securitySettings`.
4. **Partner Hijack on Already-Linked Account**: `update /users/victim_uid` attempting to set `partnerId = "attacker_uid"` when `victim_uid` already has `isPartnerLinked == true`.
5. **Email Mutation Attack**: `update /users/own_uid` changing `email` to an arbitrary string not matching `request.auth.token.email`.
6. **1MB Denial-of-Wallet String Poisoning**: `create /users/own_uid` or `create /invites/AAAAAA` with a 500KB `senderName` or `name` field, or oversized document ID > 128 chars.
7. **Unbounded Array Exhaustion**: `update /users/victim_uid` pushing > 150 notifications or `create /partner_requests/req1` with 100 items in `requested_permissions`.
8. **Cross-User Notification Snooping**: `list /notifications` or `get /notifications/n1` where `recipientId != request.auth.uid && senderId != request.auth.uid`.
9. **Unauthorized Gift Injection**: `create /users/random_user/gifts/g1` where requester is not linked via `isPartnerOf(random_user)` and not owner.
10. **Forged Invite Creation**: `create /invites/ABC123` with `{ code: "ABC123", senderId: "someone_else", senderName: "Bob", createdAt: "..." }`.
11. **Global Config Poisoning**: `write /global_config/payment` changing payment bank details from a client session.
12. **Cross-User Telemetry Scraping**: `list /analytics_events` or `get /crash_reports/r1` belonging to another `userId`.
