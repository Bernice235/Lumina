import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { User, ReceivedComfort, PartnerSharedSummary } from '../types';
import {
  purgeAllLuminaClientSecrets,
  saveEncryptedSessionUser,
  secureStorage
} from './secureStorage';
import { redactEmailForLogs, verifyLocalCredential } from './securityService';

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as any;
  }
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      newObj[key] = cleanUndefined(val);
    }
  }
  return newObj;
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const isSandboxId = (id?: string | null): boolean => {
  if (!id) return false;
  return id.startsWith('sandbox_') || id.startsWith('offline_');
};

export const checkIsOnboardingCompleted = (userObj?: Partial<User> | null, backupObj?: Partial<User> | null): boolean => {
  if (!userObj && !backupObj) return false;

  // Cloud / primary user flag === true is strictly sticky so stale local backups never push returning users back into onboarding
  if (userObj?.onboardingCompleted === true) return true;
  if (userObj?.onboardingCompleted === false) return false;

  if (backupObj?.onboardingCompleted === true) return true;

  const hasLoggedData = !!(
    (userObj?.periods && userObj.periods.length > 0) ||
    (userObj?.periodDates && userObj.periodDates.length > 0) ||
    (userObj?.symptoms && userObj.symptoms.length > 0) ||
    (userObj?.moodLogs && userObj.moodLogs.length > 0) ||
    (userObj?.diaryEntries && userObj.diaryEntries.length > 0) ||
    (userObj?.bcLogs && userObj.bcLogs.length > 0) ||
    (backupObj?.periods && backupObj.periods.length > 0) ||
    (backupObj?.symptoms && backupObj.symptoms.length > 0) ||
    (backupObj?.moodLogs && backupObj.moodLogs.length > 0)
  );

  if (hasLoggedData) return true;
  if (backupObj?.onboardingCompleted === false) return false;

  return false;
};

/**
 * Builds a strictly sanitized, consent-filtered Partner Shared Summary projection.
 * Diary entries, PINs/hashes, 2FA secrets, email addresses, and unconsented health logs are NEVER included.
 */
export function buildPartnerSharedProjection(user: User): PartnerSharedSummary {
  const settings = {
    shareCycleInfo: user.sharingSettings?.shareCycleInfo === true,
    shareSymptoms: user.sharingSettings?.shareSymptoms === true,
    shareMood: user.sharingSettings?.shareMood === true,
    shareNotes: false,
    shareFertilityInfo: user.sharingSettings?.shareFertilityInfo === true,
    sharePregnancyInfo: user.sharingSettings?.sharePregnancyInfo === true,
    shareIntimacyInfo: user.sharingSettings?.shareIntimacyInfo === true,
    shareDoctorReports: false,
    shareAppointmentReminders: user.sharingSettings?.shareAppointmentReminders === true,
    shareWellnessUpdates: user.sharingSettings?.shareWellnessUpdates === true,
  };

  const isLinked = Boolean(user.isPartnerLinked && user.partnerId);
  const isPaused = Boolean(user.isSharingPaused);

  const summary: PartnerSharedSummary = {
    ownerId: user.id,
    ownerName: getUserDisplayName(user),
    theme: user.theme,
    isPartnerLinked: isLinked,
    isSharingPaused: isPaused,
    updatedAt: new Date().toISOString(),
    sharingSettings: settings,
  };

  if (!isLinked || isPaused) {
    return summary;
  }

  if (settings.shareCycleInfo) {
    summary.cycleLength = user.cycleLength;
    summary.previousCycleLength = user.previousCycleLength;
    summary.periodLength = user.periodLength;
    summary.lastPeriodStart = user.lastPeriodStart;
    summary.periods = user.periods || [];
    summary.periodLogs = user.periodLogs || [];
    summary.periodDates = user.periodDates || [];
  }

  if (settings.shareFertilityInfo) {
    summary.fertilityStatusShared = true;
  }

  if (settings.shareSymptoms) {
    summary.symptoms = user.symptoms || [];
    if (user.todaySymptomLog) {
      summary.todaySymptomLog = user.todaySymptomLog;
    }
  }

  if (settings.shareMood) {
    summary.moodLogs = (user.moodLogs || []).map((m) => ({
      id: m.id,
      date: m.date,
      mood: m.mood,
    }));
  }

  if (settings.sharePregnancyInfo) {
    summary.isPregnancyMode = Boolean(user.isPregnancyMode);
    summary.isPostpartumMode = Boolean(user.isPostpartumMode);
    summary.pregnancyStartDate = user.pregnancyStartDate;
    summary.deliveryDate = user.deliveryDate;
    if (settings.shareAppointmentReminders) {
      summary.pregnancyAppointments = user.pregnancyAppointments || [];
    }
  }

  if (settings.shareIntimacyInfo) {
    summary.sexualActivityLogs = (user.sexualActivityLogs || []).map((s) => ({
      id: s.id,
      date: s.date,
      protected: s.protected,
      hadSex: s.hadSex,
      protection: s.protection,
    }));
  }

  if (settings.shareWellnessUpdates) {
    summary.wishlist = user.wishlist || [];
    summary.partnerSupportPreferences = user.partnerSupportPreferences;
    summary.receivedComforts = user.receivedComforts || [];
  }

  return summary;
}

/**
 * Synchronizes the strictly projected partner_shared/summary document owned by the primary user.
 */
export async function syncPartnerSharedProjection(user: User): Promise<void> {
  if (!user?.id || user.isPartner) return;
  const projection = buildPartnerSharedProjection(user);

  if (isSandboxId(user.id)) {
    await secureStorage.setItem(`partner_shared_${user.id}`, JSON.stringify(projection));
    window.dispatchEvent(new CustomEvent('lumina:partner-projection-updated', { detail: { userId: user.id } }));
    return;
  }

  try {
    await setDoc(doc(db, 'users', user.id, 'partner_shared', 'summary'), cleanUndefined(projection));
  } catch (err: any) {
    console.warn('[syncPartnerSharedProjection] Notice:', err?.code || 'sync-deferred');
  }
}

export const syncUser = async (user: User) => {
  if (!user || !user.id) {
    console.warn('[syncUser] Aborted sync: missing user identifier');
    return;
  }

  // Persist locally strictly inside AES-GCM-256 encrypted vault / session vault (never plaintext localStorage)
  try {
    const rememberMe = typeof window !== 'undefined' ? localStorage.getItem('lumina_remember_me') !== 'false' : true;
    await saveEncryptedSessionUser(user, rememberMe);
    await secureStorage.setItem(`user_profile_${user.id}`, JSON.stringify(user));
  } catch (e) {
    console.warn('[syncUser] Encrypted cache notice:', e instanceof Error ? e.message : 'storage');
  }

  if (isSandboxId(user.id)) {
    if (!user.isPartner) {
      await syncPartnerSharedProjection(user);
    }
    window.dispatchEvent(new CustomEvent('lumina:sandbox-user-updated', { detail: { userId: user.id } }));
    return;
  }

  try {
    await setDoc(doc(db, 'users', user.id), cleanUndefined(user), { merge: true });
    if (!user.isPartner) {
      await syncPartnerSharedProjection(user);
    }
  } catch (error: any) {
    console.warn('[syncUser] Firestore sync deferred:', error?.code || 'offline');
  }
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  if (isSandboxId(userId)) {
    let cancelled = false;
    secureStorage.getItem(`user_profile_${userId}`).then((raw) => {
      if (!cancelled) callback(raw ? safeJsonParse<User | null>(raw, null) : null);
    });

    const listener = () => {
      secureStorage.getItem(`user_profile_${userId}`).then((raw) => {
        if (!cancelled) callback(raw ? safeJsonParse<User | null>(raw, null) : null);
      });
    };
    window.addEventListener('lumina:sandbox-user-updated', listener);
    return () => {
      cancelled = true;
      window.removeEventListener('lumina:sandbox-user-updated', listener);
    };
  }

  return onSnapshot(
    doc(db, 'users', userId),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as User);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('[subscribeToUser] Firestore listener notice:', error?.code || 'offline');
      secureStorage
        .getItem(`user_profile_${userId}`)
        .then((raw) => callback(raw ? safeJsonParse<User | null>(raw, null) : null))
        .catch(() => callback(null));
    }
  );
};

/**
 * Subscribes a linked Partner exclusively to the consented /users/{primaryUserId}/partner_shared/summary projection.
 * Partners never read /users/{primaryUserId} directly.
 */
export const subscribeToPartnerSharedView = (
  primaryUserId: string,
  callback: (summary: PartnerSharedSummary | null) => void
) => {
  if (!primaryUserId) {
    callback(null);
    return () => {};
  }

  if (isSandboxId(primaryUserId)) {
    let cancelled = false;
    const load = () => {
      secureStorage.getItem(`partner_shared_${primaryUserId}`).then((raw) => {
        if (!cancelled) callback(raw ? safeJsonParse<PartnerSharedSummary | null>(raw, null) : null);
      });
    };
    load();
    window.addEventListener('lumina:partner-projection-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('lumina:partner-projection-updated', load);
    };
  }

  return onSnapshot(
    doc(db, 'users', primaryUserId, 'partner_shared', 'summary'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as PartnerSharedSummary);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn('[subscribeToPartnerSharedView] Access restricted or offline:', error?.code || 'denied');
      callback(null);
    }
  );
};

export const createInvite = async (userId: string, userName: string) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randBytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(randBytes);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[randBytes[i] % alphabet.length];
  }
  const inviteData = {
    code,
    senderId: userId,
    senderName: userName,
    createdAt: new Date().toISOString()
  };

  if (isSandboxId(userId)) {
    await secureStorage.setItem(`invite_${code}`, JSON.stringify(inviteData));
    return code;
  }

  const path = `invites/${code}`;
  try {
    await setDoc(doc(db, 'invites', code), inviteData);
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const addNotificationToUser = async (
  targetUserId: string,
  notification: { title: string; body: string; emoji?: string; category?: string; isPartnerRequest?: boolean }
) => {
  const isReq =
    notification.isPartnerRequest ||
    notification.category === 'partner_request' ||
    (notification.title && notification.title.toLowerCase().includes('request')) ||
    (notification.title && notification.title.toLowerCase().includes('invite'));

  const nowIso = new Date().toISOString();
  const notifId = `notif_${crypto.randomUUID()}`;
  const senderUid = auth.currentUser?.uid || targetUserId;

  if (isSandboxId(targetUserId)) {
    const raw = await secureStorage.getItem(`user_profile_${targetUserId}`);
    if (raw) {
      const userObj = safeJsonParse<any>(raw, {});
      const existing = userObj.notifications || [];
      const notifObj = {
        id: notifId,
        title: notification.title,
        body: notification.body,
        emoji: notification.emoji || (isReq ? '💕' : '🔔'),
        timestamp: nowIso,
        isRead: false,
        category: notification.category || (isReq ? 'partner_request' : undefined),
        isPartnerRequest: isReq
      };
      await syncUser({
        ...userObj,
        notifications: cleanUndefined([notifObj, ...existing])
      });
    }
    return;
  }

  // Send via recipient-scoped /notifications/{id} collection (never mutate another user's /users/{id} doc!)
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientId: targetUserId,
      targetUserId,
      senderId: senderUid,
      type: notification.category || (isReq ? 'partner_request' : 'partner'),
      category: notification.category || (isReq ? 'partner_request' : 'partner'),
      title: notification.title.slice(0, 160),
      body: notification.body.slice(0, 600),
      emoji: (notification.emoji || (isReq ? '💕' : '🔔')).slice(0, 16),
      read: false,
      isRead: false,
      isPartnerRequest: Boolean(isReq),
      timestamp: nowIso,
    });
  } catch (err: any) {
    console.warn('Notification dispatch notice:', err?.code || 'deferred');
  }
};

export interface DirectedNotificationRecord {
  id: string;
  recipientId: string;
  senderId: string;
  type?: string;
  category?: string;
  title: string;
  body: string;
  emoji?: string;
  read?: boolean;
  isRead?: boolean;
  isPartnerRequest?: boolean;
  timestamp: string;
}

export const subscribeToIncomingNotifications = (
  userId: string,
  callback: (items: DirectedNotificationRecord[]) => void
) => {
  if (!userId || isSandboxId(userId)) {
    callback([]);
    return () => {};
  }

  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DirectedNotificationRecord));
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items);
    },
    () => callback([])
  );
};

export const markCloudNotificationRead = async (notificationId: string): Promise<void> => {
  if (!notificationId || isSandboxId(notificationId)) return;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true, isRead: true });
  } catch {}
};

export const acceptInvite = async (code: string, currentUserId: string, currentUserName: string) => {
  if (isSandboxId(currentUserId)) {
    const inviteSnap = await secureStorage.getItem(`invite_${code}`);
    const inviteData = safeJsonParse<any>(inviteSnap, null);
    if (!inviteData) {
      throw new Error('Invalid or expired code. ❌');
    }

    const currentUserRaw = await secureStorage.getItem(`user_profile_${currentUserId}`);
    if (currentUserRaw) {
      const currentUser = safeJsonParse<any>(currentUserRaw, {});
      await syncUser({
        ...currentUser,
        partnerId: inviteData.senderId,
        partnerName: inviteData.senderName,
        isPartnerLinked: false,
        isPartner: true,
        partnerRequest: {
          partnerId: inviteData.senderId,
          partnerName: inviteData.senderName,
          requestedReceives: ['Period Updates', 'Wellness Support'],
          status: 'pending' as const,
          timestamp: new Date().toISOString()
        }
      });
    }

    await submitPartnerRequest(
      inviteData.senderId,
      currentUserId,
      currentUserName,
      inviteData.senderEmail || '',
      ['Period Updates', 'Wellness Support']
    );

    await addNotificationToUser(inviteData.senderId, {
      title: '💕 New Partner Connection Request',
      body: `${currentUserName} requested to connect with you via invite. Open Partner Circle to review and approve.`,
      emoji: '💕',
      category: 'partner_request',
      isPartnerRequest: true,
    });

    await secureStorage.removeItem(`invite_${code}`);
    return { ...inviteData, name: inviteData.senderName };
  }

  const path = `invites/${code}`;
  try {
    const inviteSnap = await getDoc(doc(db, 'invites', code));
    if (!inviteSnap.exists()) {
      throw new Error('Invalid or expired code. ❌');
    }
    const inviteData = inviteSnap.data();

    const requestData = {
      partnerId: inviteData.senderId,
      partnerName: inviteData.senderName,
      requestedReceives: ['Period Updates', 'Wellness Support'],
      status: 'pending' as const,
      timestamp: new Date().toISOString()
    };

    // Partner updates ONLY their own user document (never writes into /users/{senderId})
    await updateDoc(doc(db, 'users', currentUserId), {
      partnerId: inviteData.senderId,
      partnerName: inviteData.senderName,
      isPartnerLinked: false,
      isPartner: true,
      partnerRequest: requestData
    });

    await submitPartnerRequest(
      inviteData.senderId,
      currentUserId,
      currentUserName,
      inviteData.senderEmail || '',
      ['Period Updates', 'Wellness Support']
    );

    await addNotificationToUser(inviteData.senderId, {
      title: '💕 New Partner Connection Request',
      body: `${currentUserName} requested to connect with you. Open Partner Circle to review and explicitly approve sharing.`,
      emoji: '💕',
      category: 'partner_request',
      isPartnerRequest: true,
    });

    await deleteDoc(doc(db, 'invites', code));
    return { ...inviteData, name: inviteData.senderName };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export const disconnectPartner = async (userId: string, partnerId: string) => {
  if (isSandboxId(userId)) {
    const userRaw = await secureStorage.getItem(`user_profile_${userId}`);
    if (userRaw) {
      const u = safeJsonParse<User>(userRaw, {} as User);
      const disconnected: User = {
        ...u,
        partnerId: undefined,
        partnerName: '',
        isPartnerLinked: false
      };
      await syncUser(disconnected);
    }
    return;
  }

  try {
    await updateDoc(doc(db, 'users', userId), {
      partnerId: null,
      partnerName: '',
      isPartnerLinked: false
    });
    // Immediately wipe partner shared summary if owned by disconnecting primary user
    await deleteDoc(doc(db, 'users', userId, 'partner_shared', 'summary')).catch(() => {});

    if (partnerId) {
      // Notify partner so their client clears its own local/user state cleanly
      await addNotificationToUser(partnerId, {
        title: 'Partner Connection Ended',
        body: 'Your partner connection has been disconnected and shared cycle access has been revoked.',
        emoji: '🔒',
        category: 'partner',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
};

export const sendGift = async (senderName: string, senderId: string, receiverId: string, type: string) => {
  const giftId = crypto.randomUUID();
  const giftObj = {
    id: giftId,
    type,
    senderId,
    senderName,
    timestamp: new Date().toISOString()
  };

  if (isSandboxId(senderId) || isSandboxId(receiverId)) {
    const currentGiftsRaw = await secureStorage.getItem(`gifts_${receiverId}`);
    const gifts = safeJsonParse<any[]>(currentGiftsRaw, []);
    gifts.push(giftObj);
    await secureStorage.setItem(`gifts_${receiverId}`, JSON.stringify(gifts));
    window.dispatchEvent(new CustomEvent('lumina:gifts-updated', { detail: { receiverId } }));
    return;
  }

  const path = `users/${receiverId}/gifts`;
  try {
    await setDoc(doc(db, 'users', receiverId, 'gifts', giftId), giftObj);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToGifts = (userId: string, callback: (gifts: ReceivedComfort[]) => void) => {
  if (isSandboxId(userId)) {
    let cancelled = false;
    const load = () => {
      secureStorage.getItem(`gifts_${userId}`).then((raw) => {
        if (!cancelled) callback(safeJsonParse<ReceivedComfort[]>(raw, []));
      });
    };
    load();
    window.addEventListener('lumina:gifts-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('lumina:gifts-updated', load);
    };
  }

  const q = collection(db, 'users', userId, 'gifts');
  return onSnapshot(
    q,
    (snapshot) => {
      const gifts = snapshot.docs.map((d) => d.data() as ReceivedComfort);
      callback(gifts);
    },
    (error) => {
      console.warn('[subscribeToGifts] Notice:', error?.code || 'offline');
      callback([]);
    }
  );
};

export interface DPartnerRequest {
  id: string;
  request_id: string;
  user_id: string;
  partner_id: string;
  partnerName: string;
  partnerEmail?: string;
  requested_permissions: string[];
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
}

export const subscribeToPartnerRequests = (
  roleId: string,
  role: 'user' | 'partner',
  callback: (requests: DPartnerRequest[]) => void
) => {
  if (isSandboxId(roleId)) {
    let cancelled = false;
    const getLocalRequests = async () => {
      try {
        const saved = await secureStorage.getItem('partner_requests_v1');
        const list = saved ? JSON.parse(saved) : [];
        const filtered = role === 'user'
          ? list.filter((r: any) => r.user_id === roleId || r.userId === roleId)
          : list.filter((r: any) => r.partner_id === roleId || r.partnerId === roleId);
        if (!cancelled) callback(filtered);
      } catch {
        if (!cancelled) callback([]);
      }
    };
    getLocalRequests();
    window.addEventListener('lumina:partner-requests-updated', getLocalRequests);
    return () => {
      cancelled = true;
      window.removeEventListener('lumina:partner-requests-updated', getLocalRequests);
    };
  }

  const collRef = collection(db, 'partner_requests');
  const q = query(collRef, where(role === 'user' ? 'user_id' : 'partner_id', '==', roleId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DPartnerRequest));
      callback(list);
    },
    (err) => {
      console.warn('[subscribeToPartnerRequests] Notice:', err?.code || 'offline');
      callback([]);
    }
  );
};

export const submitPartnerRequest = async (
  userId: string,
  partnerId: string,
  partnerName: string,
  partnerEmail: string,
  requestedPermissions: string[]
) => {
  const isSandbox = isSandboxId(userId) || isSandboxId(partnerId);
  const request_id = isSandbox ? crypto.randomUUID() : `${userId}_${partnerId}`;
  const nowIso = new Date().toISOString();

  const requestData: DPartnerRequest & { userId?: string; partnerId?: string; createdAt?: string } = {
    id: request_id,
    request_id,
    user_id: userId,
    userId,
    partner_id: partnerId,
    partnerId,
    partnerName,
    partnerEmail,
    requested_permissions: requestedPermissions,
    status: 'pending',
    created_at: nowIso,
    createdAt: nowIso
  };

  console.log('[PartnerRequest] Submitting request', {
    requestId: request_id,
    partnerEmail: redactEmailForLogs(partnerEmail),
  });

  const notifId = `notif_partner_req_${Date.now()}`;
  const notifObj = {
    id: notifId,
    recipientId: userId,
    targetUserId: userId,
    senderId: partnerId,
    type: 'partner_request' as const,
    category: 'partner_request' as const,
    title: 'New Partner Request',
    body: `${partnerName} requested to connect on Partner Mode. Review and explicitly approve permissions before any cycle info is shared.`,
    emoji: '💕',
    read: false,
    isRead: false,
    timestamp: nowIso,
    isPartnerRequest: true
  };

  if (isSandbox) {
    const saved = await secureStorage.getItem('partner_requests_v1');
    const list = saved ? JSON.parse(saved) : [];
    const filtered = list.filter((r: any) => !(r.user_id === userId && r.partner_id === partnerId));
    filtered.push(requestData);
    await secureStorage.setItem('partner_requests_v1', JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('lumina:partner-requests-updated'));
    return request_id;
  }

  const path = `partner_requests/${request_id}`;
  try {
    await setDoc(doc(db, 'partner_requests', request_id), requestData);
    await setDoc(doc(db, 'notifications', notifId), notifObj).catch(() => {});
    return request_id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updatePartnerRequestStatus = async (requestId: string, status: 'approved' | 'declined') => {
  const isSandbox = requestId.length < 15 || isSandboxId(requestId);

  if (isSandbox) {
    const saved = await secureStorage.getItem('partner_requests_v1');
    const list = saved ? JSON.parse(saved) : [];
    const updated = list.map((r: any) => (r.id === requestId ? { ...r, status } : r));
    await secureStorage.setItem('partner_requests_v1', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('lumina:partner-requests-updated'));
    return;
  }

  const path = `partner_requests/${requestId}`;
  try {
    await updateDoc(doc(db, 'partner_requests', requestId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getInvite = async (code: string) => {
  const localInv = await secureStorage.getItem(`invite_${code}`);
  if (localInv) {
    return safeJsonParse<any>(localInv, null);
  }
  try {
    const inviteSnap = await getDoc(doc(db, 'invites', code));
    if (inviteSnap.exists()) {
      return inviteSnap.data();
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Primary user approves connection: updates primary user's OWN profile & partner_shared/summary projection,
 * and marks the partner request approved so the partner's own client completes mutual linking cleanly.
 */
export const completePartnerConnection = async (
  userId: string,
  partnerId: string,
  partnerName: string,
  userName: string
) => {
  const isSandbox = isSandboxId(userId) || isSandboxId(partnerId);
  if (isSandbox) {
    const saved = await secureStorage.getItem('partner_requests_v1');
    const list = safeJsonParse<any[]>(saved, []);
    const updated = list.map((r: any) =>
      r.user_id === userId && r.partner_id === partnerId ? { ...r, status: 'approved' as const } : r
    );
    await secureStorage.setItem('partner_requests_v1', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('lumina:partner-requests-updated'));
    return;
  }

  try {
    await updateDoc(doc(db, 'users', userId), {
      partnerId,
      partnerName,
      isPartnerLinked: true
    });

    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      await syncPartnerSharedProjection({ ...(userSnap.data() as User), id: userId, partnerId, partnerName, isPartnerLinked: true });
    }

    await addNotificationToUser(partnerId, {
      title: '💕 Partner Request Approved',
      body: `${userName} approved your Partner Circle connection.`,
      emoji: '💕',
      category: 'partner',
    });
  } catch (error) {
    console.error('Failed to complete partner connection:', error);
  }
};

export const getCleanName = (name: string | undefined | null, email: string | undefined | null): string => {
  const isPlaceholder = (n: string | undefined | null) => {
    if (!n) return true;
    const lower = n.toLowerCase().trim();
    return (
      lower === '' ||
      lower === 'ella' ||
      lower === 'demo user' ||
      lower === 'test user' ||
      lower === 'bloom member' ||
      lower === 'null' ||
      lower === 'undefined'
    );
  };

  if (name && !isPlaceholder(name)) {
    const cleanStr = name.trim();
    const firstWord = cleanStr.split(/[\s,.-]+/)[0];
    if (firstWord && !isPlaceholder(firstWord)) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
    return cleanStr;
  }

  if (email && email.includes('@')) {
    const part = email.split('@')[0];
    if (part) {
      const cleanPart = part.replace(/[^a-zA-Z]/g, ' ');
      const camelSplit = cleanPart
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
      const words = camelSplit.trim().split(/\s+/);
      const firstWord = words[0];
      if (firstWord && !isPlaceholder(firstWord)) {
        return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
      }
    }
  }

  return '';
};

export const getUserDisplayName = (user: { name?: string; email?: string } | null | undefined) => {
  if (!user) return 'Friend';
  const clean = getCleanName(user.name, user.email);
  return clean || 'Friend';
};

export const getSanctuaryTitle = (userOrPartner: { name?: string; email?: string } | null | undefined): string => {
  if (!userOrPartner) return "Your Partner's Sanctuary 🌸";
  const name = getCleanName(userOrPartner.name, userOrPartner.email);
  if (!name) return "Your Partner's Sanctuary 🌸";
  return `${name}'s Sanctuary 🌸`;
};

// --- GLOBAL PAYMENT CONFIGURATION ---
export interface GlobalBankConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const saveGlobalBankDetails = async (config: GlobalBankConfig) => {
  try {
    await secureStorage.setItem('lumina_global_bank_config', JSON.stringify(config));
    try { localStorage.removeItem('lumina_global_bank_config'); } catch {}
  } catch {}
};

export const getGlobalBankDetails = async (): Promise<GlobalBankConfig | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'global_config', 'payment'));
    if (docSnap.exists()) {
      const data = docSnap.data() as GlobalBankConfig;
      await secureStorage.setItem('lumina_global_bank_config', JSON.stringify(data));
      try { localStorage.removeItem('lumina_global_bank_config'); } catch {}
      return data;
    }
  } catch {}
  const cachedSecure = await secureStorage.getItem('lumina_global_bank_config');
  if (cachedSecure) {
    return safeJsonParse<GlobalBankConfig | null>(cachedSecure, null);
  }
  try {
    const legacy = localStorage.getItem('lumina_global_bank_config');
    if (legacy) {
      await secureStorage.setItem('lumina_global_bank_config', legacy);
      localStorage.removeItem('lumina_global_bank_config');
      return safeJsonParse<GlobalBankConfig | null>(legacy, null);
    }
  } catch {}
  return null;
};

export const blockPartner = async (
  userId: string,
  partnerIdToBlock: string,
  partnerDetails?: { id?: string; name?: string; email?: string }
) => {
  if (!userId || !partnerIdToBlock) return;

  await disconnectPartner(userId, partnerIdToBlock);

  if (isSandboxId(userId)) {
    const userRaw = await secureStorage.getItem(`user_profile_${userId}`);
    if (userRaw) {
      const u: User = safeJsonParse<any>(userRaw, {});
      const existingBlocked = u.blockedPartners || [];
      const isAlreadyBlocked = existingBlocked.some((b) => b.id === partnerIdToBlock);
      const newBlocked = isAlreadyBlocked
        ? existingBlocked
        : [
            ...existingBlocked,
            {
              id: partnerIdToBlock,
              name: partnerDetails?.name || u.partnerName || 'Partner',
              email: partnerDetails?.email,
              dateBlocked: new Date().toISOString()
            }
          ];
      await syncUser({
        ...u,
        partnerId: undefined,
        partnerName: '',
        isPartnerLinked: false,
        partnerRequest: undefined,
        blockedPartners: newBlocked
      });
    }
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const u = userSnap.data() as User;
      const existingBlocked = u.blockedPartners || [];
      const isAlreadyBlocked = existingBlocked.some((b) => b.id === partnerIdToBlock);
      const newBlocked = isAlreadyBlocked
        ? existingBlocked
        : [
            ...existingBlocked,
            {
              id: partnerIdToBlock,
              name: partnerDetails?.name || u.partnerName || 'Partner',
              email: partnerDetails?.email,
              dateBlocked: new Date().toISOString()
            }
          ];
      await updateDoc(doc(db, 'users', userId), {
        partnerId: null,
        partnerName: '',
        isPartnerLinked: false,
        partnerRequest: null,
        blockedPartners: cleanUndefined(newBlocked)
      });
      await deleteDoc(doc(db, 'users', userId, 'partner_shared', 'summary')).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
};

export const unblockPartner = async (userId: string, partnerIdToUnblock: string) => {
  if (!userId || !partnerIdToUnblock) return;

  if (isSandboxId(userId)) {
    const userRaw = await secureStorage.getItem(`user_profile_${userId}`);
    if (userRaw) {
      const u: User = safeJsonParse<any>(userRaw, {});
      const existingBlocked = u.blockedPartners || [];
      const newBlocked = existingBlocked.filter((b) => b.id !== partnerIdToUnblock);
      await syncUser({
        ...u,
        blockedPartners: newBlocked
      });
    }
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const u = userSnap.data() as User;
      const existingBlocked = u.blockedPartners || [];
      const newBlocked = existingBlocked.filter((b) => b.id !== partnerIdToUnblock);
      await updateDoc(doc(db, 'users', userId), {
        blockedPartners: cleanUndefined(newBlocked)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
};

export function getCurrentAuthProviders(): string[] {
  const fbUser = auth.currentUser;
  if (!fbUser) return [];
  return (fbUser.providerData || []).map((p) => p.providerId).filter(Boolean);
}

/**
 * Enforces recent authentication (password credential or Google/Apple OAuth popup)
 * before destructive account actions. Throws clear user-facing error on failure.
 */
export const reauthenticateCurrentUser = async (options?: {
  password?: string;
  email?: string;
  userId?: string;
}): Promise<void> => {
  const fbUser = auth.currentUser;

  if (!fbUser || (options?.userId && isSandboxId(options.userId))) {
    // Sandbox / offline-only account: if a password was supplied and a local verifier exists, validate it
    const targetEmail = options?.email?.trim();
    if (targetEmail && options?.password) {
      const verdict = await verifyLocalCredential(targetEmail, options.password);
      if (verdict === 'invalid') {
        throw new Error('Incorrect password. Please enter your current password to continue.');
      }
    }
    return;
  }

  const providers = getCurrentAuthProviders();
  if (providers.includes('password') && fbUser.email) {
    const pwd = options?.password;
    if (!pwd) {
      throw new Error('Please enter your current password to verify your identity before deleting your account.');
    }
    try {
      const cred = EmailAuthProvider.credential(fbUser.email, pwd);
      await reauthenticateWithCredential(fbUser, cred);
      return;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Incorrect password. Please check your current password and try again.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Too many failed verification attempts. Please wait a few minutes before trying again.');
      }
      if (code === 'auth/network-request-failed') {
        throw new Error('A network connection is required to verify your identity and permanently delete your cloud account.');
      }
      throw new Error(err?.message || 'Unable to verify your password right now.');
    }
  }

  if (providers.includes('google.com')) {
    try {
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(fbUser, provider);
      return;
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google verification window was closed before confirmation completed.');
      }
      throw new Error(err?.message || 'Google identity verification failed. Please try again.');
    }
  }

  if (providers.includes('apple.com')) {
    try {
      const provider = new OAuthProvider('apple.com');
      await reauthenticateWithPopup(fbUser, provider);
      return;
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        throw new Error('Apple verification window was closed before confirmation completed.');
      }
      throw new Error(err?.message || 'Apple identity verification failed. Please try again.');
    }
  }

  // Fallback token refresh check
  await fbUser.getIdToken(true);
};

async function deleteQueryDocs(qRef: ReturnType<typeof query>): Promise<void> {
  try {
    const snap = await getDocs(qRef);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
  } catch {
    // Best-effort cleanup for secondary collections
  }
}

export interface AccountDeletionResult {
  uid: string;
  deletedAt: string;
  cloudDeleted: boolean;
  authDeleted: boolean;
}

export const deleteUserAccount = async (
  userId: string,
  options?: { password?: string; email?: string; skipReauth?: boolean }
): Promise<AccountDeletionResult> => {
  if (!userId) {
    throw new Error('Missing user identifier for account deletion.');
  }

  const sandbox = isSandboxId(userId);
  const fbUser = auth.currentUser;

  // 1. Mandatory Reauthentication FIRST — never delete any cloud records unless identity is freshly verified
  if (!options?.skipReauth) {
    await reauthenticateCurrentUser({
      password: options?.password,
      email: options?.email || fbUser?.email || undefined,
      userId,
    });
  }

  if (!sandbox && fbUser && fbUser.uid !== userId) {
    throw new Error('Signed-in session does not match the account requested for deletion.');
  }

  // 2. Read user profile metadata (partnerId / partnerCode / email) before purging Firestore
  let partnerIdToDisconnect = '';
  let partnerCodeToDelete = '';
  let userEmail = options?.email || fbUser?.email || '';
  try {
    if (!sandbox) {
      const cloudSnap = await getDoc(doc(db, 'users', userId)).catch(() => null);
      if (cloudSnap?.exists()) {
        const u = cloudSnap.data() as User;
        partnerIdToDisconnect = u.partnerId || '';
        partnerCodeToDelete = u.partnerCode || '';
        userEmail = userEmail || u.email || '';
      }
    }
    const userRaw = await secureStorage.getItem(`user_profile_${userId}`);
    if (userRaw) {
      const localU: User = safeJsonParse<any>(userRaw, {});
      partnerIdToDisconnect = partnerIdToDisconnect || localU.partnerId || '';
      partnerCodeToDelete = partnerCodeToDelete || localU.partnerCode || '';
      userEmail = userEmail || localU.email || '';
    }
  } catch {}

  // 3. Disconnect partner cleanly before deleting user document
  if (partnerIdToDisconnect) {
    try {
      await disconnectPartner(userId, partnerIdToDisconnect);
    } catch (e) {
      console.warn('Error disconnecting partner before delete:', e);
    }
  }

  // 4. Delete all Firestore documents owned by this user while request.auth is still active
  let cloudDeleted = false;
  if (!sandbox) {
    try {
      await deleteDoc(doc(db, 'users', userId, 'partner_shared', 'summary')).catch(() => {});

      // Delete gifts subcollection
      try {
        const giftsSnap = await getDocs(collection(db, 'users', userId, 'gifts'));
        await Promise.all(giftsSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
      } catch {}

      // Delete active invite code if stored
      if (partnerCodeToDelete) {
        await deleteDoc(doc(db, 'invites', partnerCodeToDelete.toUpperCase())).catch(() => {});
      }
      await deleteQueryDocs(query(collection(db, 'invites'), where('senderId', '==', userId)));

      // Delete partner requests where user is primary user or partner
      await deleteQueryDocs(query(collection(db, 'partner_requests'), where('user_id', '==', userId)));
      await deleteQueryDocs(query(collection(db, 'partner_requests'), where('partner_id', '==', userId)));

      // Delete notifications sent or received by user
      await deleteQueryDocs(query(collection(db, 'notifications'), where('recipientId', '==', userId)));
      await deleteQueryDocs(query(collection(db, 'notifications'), where('senderId', '==', userId)));

      // Delete telemetry & crash reports scoped to user (GDPR/NDPA erasure)
      await deleteQueryDocs(query(collection(db, 'analytics_events'), where('userId', '==', userId)));
      await deleteQueryDocs(query(collection(db, 'crash_reports'), where('userId', '==', userId)));

      // Delete primary user document
      await deleteDoc(doc(db, 'users', userId));
      cloudDeleted = true;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      throw new Error(error?.message || 'Unable to erase cloud health records. Please check your connection and try again.');
    }
  }

  // 5. Permanently delete Firebase Auth user record & revoke tokens
  let authDeleted = false;
  if (!sandbox && auth.currentUser) {
    try {
      await deleteUser(auth.currentUser);
      authDeleted = true;
    } catch (authErr: any) {
      const code = authErr?.code || '';
      if (code === 'auth/requires-recent-login') {
        throw new Error('Your login session expired during deletion. Please re-enter your credentials and try again.');
      }
      throw new Error(authErr?.message || 'Unable to remove your authentication account right now.');
    }
  }

  // 6. Erase all local encrypted vaults, offline verifiers, backups, and storage keys
  if (userEmail) {
    const cleanEmail = userEmail.toLowerCase().trim();
    await secureStorage.removeItem(`user_email_${cleanEmail}`).catch(() => {});
    await secureStorage.removeItem(`offline_user_${cleanEmail}`).catch(() => {});
  }
  await purgeAllLuminaClientSecrets({
    clearOfflineVerifiers: true,
    clearBiometricBinding: true,
    fullAccountErasure: true,
    userId,
  });

  return {
    uid: userId,
    deletedAt: new Date().toISOString(),
    cloudDeleted,
    authDeleted,
  };
};

export const deletePartnerAccount = async (
  partnerId: string,
  options?: { password?: string; email?: string; skipReauth?: boolean }
) => {
  return deleteUserAccount(partnerId, options);
};
