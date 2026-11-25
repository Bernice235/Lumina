import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { User, ReceivedComfort, PartnerSharedSummary } from '../types';
import {
  purgeAllLuminaClientSecrets,
  saveEncryptedSessionUser,
  secureStorage
} from './secureStorage';
import { redactEmailForLogs } from './securityService';

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

  if (userObj?.onboardingCompleted === false) return false;
  if (backupObj?.onboardingCompleted === false && userObj?.onboardingCompleted !== true) return false;

  if (userObj?.onboardingCompleted === true) return true;
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

  return hasLoggedData;
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
    shareNotes: user.sharingSettings?.shareNotes === true,
    shareFertilityInfo: user.sharingSettings?.shareFertilityInfo === true,
    sharePregnancyInfo: user.sharingSettings?.sharePregnancyInfo === true,
    shareIntimacyInfo: user.sharingSettings?.shareIntimacyInfo === true,
    shareDoctorReports: user.sharingSettings?.shareDoctorReports === true,
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
      ...(settings.shareNotes && m.note ? { note: m.note } : {}),
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

export const createInvite = async (userId: string, userName: string, userEmail?: string) => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const inviteData = {
    code,
    senderId: userId,
    senderName: userName,
    senderEmail: userEmail || '',
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
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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
  const giftId = Math.random().toString(36).substring(2, 11);
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
  const request_id = isSandbox ? Math.random().toString(36).substring(2, 11) : `${userId}_${partnerId}`;
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
    localStorage.setItem('lumina_global_bank_config', JSON.stringify(config));
  } catch {}
};

export const getGlobalBankDetails = async (): Promise<GlobalBankConfig | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'global_config', 'payment'));
    if (docSnap.exists()) {
      const data = docSnap.data() as GlobalBankConfig;
      localStorage.setItem('lumina_global_bank_config', JSON.stringify(data));
      return data;
    }
  } catch {}
  const cached = localStorage.getItem('lumina_global_bank_config');
  return safeJsonParse<GlobalBankConfig | null>(cached, null);
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

export const deleteUserAccount = async (userId: string) => {
  if (!userId) return;

  try {
    const userRaw = await secureStorage.getItem(`user_profile_${userId}`);
    if (userRaw) {
      const u: User = safeJsonParse<any>(userRaw, {});
      if (u.partnerId) {
        await disconnectPartner(userId, u.partnerId);
      }
    }
  } catch (e) {
    console.warn('Error disconnecting partner before delete:', e);
  }

  try {
    if (!isSandboxId(userId)) {
      await deleteDoc(doc(db, 'users', userId, 'partner_shared', 'summary')).catch(() => {});
      await deleteDoc(doc(db, 'users', userId));
    }
  } catch (error) {
    console.warn('Firestore user delete notice:', error);
  }

  try {
    if (auth.currentUser) {
      const { deleteUser } = await import('firebase/auth');
      await deleteUser(auth.currentUser);
    }
  } catch (authErr) {
    console.warn('Firebase auth deletion warning:', authErr);
  }

  await secureStorage.removeItem(`user_profile_${userId}`);
  await purgeAllLuminaClientSecrets({ clearOfflineVerifiers: true, clearBiometricBinding: true });
};

export const deletePartnerAccount = async (partnerId: string) => {
  return deleteUserAccount(partnerId);
};
