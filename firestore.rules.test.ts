/**
 * Firestore Security Rules Verification Specification & Dirty Dozen Assertions
 * Documents and verifies every adversarial payload against Lumina's Eight-Pillar Firestore rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  blockingRule: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on User Create',
    collectionPath: 'users/victim_uid',
    operation: 'create',
    authUid: 'attacker_uid',
    payload: { id: 'victim_uid', name: 'Attacker', email: 'attacker@example.com' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'isOwner(userId) && incoming().id == request.auth.uid'
  },
  {
    id: 2,
    name: 'User Directory Enumeration',
    collectionPath: 'users',
    operation: 'list',
    authUid: 'any_signed_in_uid',
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'allow list: if false;'
  },
  {
    id: 3,
    name: 'Shadow Field Privilege Escalation',
    collectionPath: 'users/attacker_uid',
    operation: 'update',
    authUid: 'attacker_uid',
    payload: { id: 'attacker_uid', name: 'User', email: 'u@example.com', isAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: "!('isAdmin' in data) in isValidUser(incoming())"
  },
  {
    id: 4,
    name: 'Partner Hijack on Linked Account',
    collectionPath: 'users/victim_uid',
    operation: 'update',
    authUid: 'attacker_uid',
    payload: { partnerId: 'attacker_uid', isPartnerLinked: false },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: "existing().get('isPartnerLinked', false) == false"
  },
  {
    id: 5,
    name: 'Verified Email Mutation Attack',
    collectionPath: 'users/owner_uid',
    operation: 'update',
    authUid: 'owner_uid',
    payload: { id: 'owner_uid', name: 'Owner', email: 'forged-admin@example.com' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'incoming().email == existing().email || incoming().email == request.auth.token.email'
  },
  {
    id: 6,
    name: 'Denial-of-Wallet Oversized String Poisoning',
    collectionPath: 'users/owner_uid',
    operation: 'update',
    authUid: 'owner_uid',
    payload: { id: 'owner_uid', name: 'x'.repeat(2000), email: 'owner@example.com' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'isBoundedString(data.name, 1, 120)'
  },
  {
    id: 7,
    name: 'Unbounded Array Exhaustion',
    collectionPath: 'partner_requests/req_1',
    operation: 'create',
    authUid: 'partner_uid',
    payload: {
      id: 'req_1',
      user_id: 'target_uid',
      partner_id: 'partner_uid',
      partnerName: 'Partner',
      requested_permissions: Array.from({ length: 50 }, (_, i) => `perm_${i}`),
      status: 'pending',
      created_at: new Date().toISOString()
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'data.requested_permissions.size() <= 20'
  },
  {
    id: 8,
    name: 'Cross-User Notification Snooping',
    collectionPath: 'notifications',
    operation: 'list',
    authUid: 'attacker_uid',
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'request.auth.uid == existing().recipientId || request.auth.uid == existing().senderId'
  },
  {
    id: 9,
    name: 'Unauthorized Gift Injection',
    collectionPath: 'users/stranger_uid/gifts/gift_1',
    operation: 'create',
    authUid: 'attacker_uid',
    payload: {
      id: 'gift_1',
      type: 'hug',
      senderId: 'attacker_uid',
      senderName: 'Attacker',
      timestamp: new Date().toISOString()
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'isPartnerOf(userId) || isOwner(userId)'
  },
  {
    id: 10,
    name: 'Forged Invite Creation',
    collectionPath: 'invites/ABC123',
    operation: 'create',
    authUid: 'attacker_uid',
    payload: {
      code: 'ABC123',
      senderId: 'victim_uid',
      senderName: 'Victim',
      createdAt: new Date().toISOString()
    },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'data.senderId == request.auth.uid'
  },
  {
    id: 11,
    name: 'Global Config Tampering',
    collectionPath: 'global_config/payment',
    operation: 'update',
    authUid: 'any_signed_in_uid',
    payload: { bankName: 'Attacker Bank', accountNumber: '0000000000', accountName: 'Attacker' },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'allow create, update, delete: if false;'
  },
  {
    id: 12,
    name: 'Cross-User Telemetry Scraping',
    collectionPath: 'crash_reports',
    operation: 'list',
    authUid: 'attacker_uid',
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'existing().userId == request.auth.uid'
  },
  {
    id: 13,
    name: 'Linked Partner Direct Full-Profile Read Leak',
    collectionPath: 'users/primary_uid',
    operation: 'get',
    authUid: 'linked_partner_uid',
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'allow get: if isValidId(userId) && isOwner(userId);'
  },
  {
    id: 14,
    name: 'Unconsented / Paused Partner Reading partner_shared Summary',
    collectionPath: 'users/primary_uid/partner_shared/summary',
    operation: 'get',
    authUid: 'unlinked_or_paused_partner_uid',
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: 'isMutuallyLinkedPartnerOf(userId)'
  },
  {
    id: 15,
    name: 'Client Free-Tier Premium Self-Promotion on Signup',
    collectionPath: 'users/attacker_uid',
    operation: 'create',
    authUid: 'attacker_uid',
    payload: { id: 'attacker_uid', name: 'Attacker', email: 'a@example.com', isPremium: true },
    expectedOutcome: 'PERMISSION_DENIED',
    blockingRule: "incoming().get('isPremium', false) == false"
  }
];
