import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where,
  serverTimestamp,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { User, ReceivedComfort, BlockedPartner } from '../types';

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

const isSandboxId = (id?: string | null): boolean => {
  if (!id) return false;
  return id.startsWith('sandbox_') || id.startsWith('offline_');
};

export const syncUser = async (user: User) => {
  if (!user || !user.id) {
    console.warn('[syncUser] Aborted sync: User object or user.id is missing or undefined');
    return;
  }

  console.log('[syncUser BEFORE write] Syncing user state to Firestore/Storage:', {
    id: user.id,
    email: user.email,
    name: user.name,
    isPartner: user.isPartner,
    lastPeriodStart: user.lastPeriodStart,
    cycleLength: user.cycleLength,
    periodLength: user.periodLength,
    periodsCount: user.periods?.length || 0,
    symptomsCount: user.symptoms?.length || 0,
    moodLogsCount: user.moodLogs?.length || 0,
    diaryEntriesCount: user.diaryEntries?.length || 0
  });

  if (isSandboxId(user.id)) {
    localStorage.setItem(`lumina_user_${user.id}`, JSON.stringify(user));
    // Trigger real-time storage event for local updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: `lumina_user_${user.id}`,
      newValue: JSON.stringify(user)
    }));
    console.log('[syncUser AFTER local write SUCCESS] Updated sandbox storage for:', user.id);
    return;
  }
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, "users", user.id), cleanUndefined(user), { merge: true });
    console.log('[syncUser AFTER Firestore write SUCCESS] Merged user doc in Firestore for:', {
      id: user.id,
      lastPeriodStart: user.lastPeriodStart,
      cycleLength: user.cycleLength,
      periodLength: user.periodLength
    });
  } catch (error) {
    console.error('[syncUser ERROR] Firestore write failed:', error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  if (isSandboxId(userId)) {
    const localData = localStorage.getItem(`lumina_user_${userId}`);
    const parsed = localData ? JSON.parse(localData) : null;
    console.log('[subscribeToUser - Sandbox] Fetched local user:', {
      userId,
      lastPeriodStart: parsed?.lastPeriodStart,
      cycleLength: parsed?.cycleLength,
      periodLength: parsed?.periodLength,
      onboardingCompleted: parsed?.onboardingCompleted
    });
    callback(parsed);

    const listener = (e: StorageEvent) => {
      if (e.key === `lumina_user_${userId}`) {
        const updated = e.newValue ? JSON.parse(e.newValue) : null;
        console.log('[subscribeToUser - Sandbox Event] Storage updated:', {
          userId,
          lastPeriodStart: updated?.lastPeriodStart,
          cycleLength: updated?.cycleLength,
          periodLength: updated?.periodLength
        });
        callback(updated);
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
  const path = `users/${userId}`;
  console.log('[subscribeToUser - Firestore] Subscribing to doc:', path);
  return onSnapshot(doc(db, "users", userId), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as User;
      console.log('[subscribeToUser - Firestore SNAPSHOT] Firestore returned user data:', {
        userId,
        email: data.email,
        name: data.name,
        lastPeriodStart: data.lastPeriodStart,
        cycleLength: data.cycleLength,
        periodLength: data.periodLength,
        periodsCount: data.periods?.length || 0,
        onboardingCompleted: data.onboardingCompleted
      });
      callback(data);
    } else {
      console.log('[subscribeToUser - Firestore SNAPSHOT] Doc does not exist for userId:', userId);
      callback(null);
    }
  }, (error) => {
    console.error('[subscribeToUser - Firestore ERROR]', error);
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const createInvite = async (userId: string, userName: string, userEmail?: string) => {
  if (isSandboxId(userId)) {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const inviteData = {
      code,
      senderId: userId,
      senderName: userName,
      senderEmail: userEmail || '',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(`lumina_invite_${code}`, JSON.stringify(inviteData));
    return code;
  }
  const code = Math.random().toString(36).substr(2, 6).toUpperCase();
  const path = `invites/${code}`;
  try {
    await setDoc(doc(db, "invites", code), {
      code,
      senderId: userId,
      senderName: userName,
      senderEmail: userEmail || '',
      createdAt: new Date().toISOString()
    });
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const acceptInvite = async (code: string, currentUserId: string, currentUserName: string) => {
  if (isSandboxId(currentUserId)) {
    const inviteSnap = localStorage.getItem(`lumina_invite_${code}`);
    if (!inviteSnap) {
      throw new Error("Invalid or expired code. ❌");
    }
    const inviteData = JSON.parse(inviteSnap);
    
    // Link current user
    const currentUserRaw = localStorage.getItem(`lumina_user_${currentUserId}`);
    if (currentUserRaw) {
      const currentUser = JSON.parse(currentUserRaw);
      const updatedUser = {
        ...currentUser,
        partnerId: inviteData.senderId,
        partnerName: inviteData.senderName,
        isPartnerLinked: false,
        isPartner: true
      };
      await syncUser(updatedUser);
    }

    // Link sender user
    const senderUserRaw = localStorage.getItem(`lumina_user_${inviteData.senderId}`);
    if (senderUserRaw) {
      const senderUser = JSON.parse(senderUserRaw);
      const updatedSender = {
        ...senderUser,
        partnerId: currentUserId,
        partnerName: currentUserName,
        isPartnerLinked: false
      };
      await syncUser(updatedSender);
    }

    localStorage.removeItem(`lumina_invite_${code}`);
    return { ...inviteData, name: inviteData.senderName };
  }
  const path = `invites/${code}`;
  try {
    const inviteSnap = await getDoc(doc(db, "invites", code));
    if (!inviteSnap.exists()) {
      throw new Error("Invalid or expired code. ❌");
    }
    const inviteData = inviteSnap.data();
    
    // Link both ways
    await updateDoc(doc(db, "users", currentUserId), {
      partnerId: inviteData.senderId,
      partnerName: inviteData.senderName,
      isPartnerLinked: false,
      isPartner: true
    });

    await updateDoc(doc(db, "users", inviteData.senderId), {
      partnerId: currentUserId,
      partnerName: currentUserName,
      isPartnerLinked: false
    });

    // Cleanup invite
    await deleteDoc(doc(db, "invites", code));
    
    return { ...inviteData, name: inviteData.senderName };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const disconnectPartner = async (userId: string, partnerId: string) => {
  if (isSandboxId(userId)) {
    const userRaw = localStorage.getItem(`lumina_user_${userId}`);
    if (userRaw) {
      const u = JSON.parse(userRaw);
      await syncUser({
        ...u,
        partnerId: undefined,
        partnerName: '',
        isPartnerLinked: false
      });
    }
    if (partnerId) {
      const pRaw = localStorage.getItem(`lumina_user_${partnerId}`);
      if (pRaw) {
        const p = JSON.parse(pRaw);
        await syncUser({
          ...p,
          partnerId: undefined,
          partnerName: '',
          isPartnerLinked: false
        });
      }
    }
    return;
  }
  try {
    await updateDoc(doc(db, "users", userId), {
      partnerId: null,
      partnerName: '',
      isPartnerLinked: false
    });
    if (partnerId) {
      await updateDoc(doc(db, "users", partnerId), {
        partnerId: null,
        partnerName: '',
        isPartnerLinked: false
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
};

export const sendGift = async (senderName: string, senderId: string, receiverId: string, type: string) => {
  if (isSandboxId(senderId) || isSandboxId(receiverId)) {
    const giftId = Math.random().toString(36).substr(2, 9);
    const giftObj = {
      id: giftId,
      type,
      senderId,
      senderName,
      timestamp: new Date().toISOString()
    };
    const currentGiftsRaw = localStorage.getItem(`lumina_gifts_${receiverId}`);
    const gifts = currentGiftsRaw ? JSON.parse(currentGiftsRaw) : [];
    gifts.push(giftObj);
    localStorage.setItem(`lumina_gifts_${receiverId}`, JSON.stringify(gifts));
    
    // Dispatch storage event manually for same-page updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: `lumina_gifts_${receiverId}`,
      newValue: JSON.stringify(gifts)
    }));
    return;
  }
  const path = `users/${receiverId}/gifts`;
  try {
    const giftId = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, "users", receiverId, "gifts", giftId), {
      id: giftId,
      type,
      senderId,
      senderName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToGifts = (userId: string, callback: (gifts: ReceivedComfort[]) => void) => {
  if (isSandboxId(userId)) {
    const localGifts = localStorage.getItem(`lumina_gifts_${userId}`);
    callback(localGifts ? JSON.parse(localGifts) : []);
    
    const listener = (e: StorageEvent) => {
      if (e.key === `lumina_gifts_${userId}`) {
        callback(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
  const path = `users/${userId}/gifts`;
  const q = collection(db, "users", userId, "gifts");
  return onSnapshot(q, (snapshot) => {
    const gifts = snapshot.docs.map(doc => doc.data() as ReceivedComfort);
    callback(gifts);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
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

export const subscribeToPartnerRequests = (roleId: string, role: 'user' | 'partner', callback: (requests: DPartnerRequest[]) => void) => {
  if (isSandboxId(roleId)) {
    const getLocalRequests = () => {
      try {
        const saved = localStorage.getItem('lumina_partner_requests');
        const list = saved ? JSON.parse(saved) : [];
        if (role === 'user') {
          return list.filter((r: any) => r.user_id === roleId);
        } else {
          return list.filter((r: any) => r.partner_id === roleId);
        }
      } catch (err) {
        return [];
      }
    };
    
    callback(getLocalRequests());
    
    const listener = (e: StorageEvent) => {
      if (e.key === 'lumina_partner_requests') {
        callback(getLocalRequests());
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
  
  const path = 'partner_requests';
  const collRef = collection(db, "partner_requests");
  const q = query(
    collRef,
    where(role === 'user' ? 'user_id' : 'partner_id', '==', roleId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DPartnerRequest));
    callback(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
  });
};

export const submitPartnerRequest = async (userId: string, partnerId: string, partnerName: string, partnerEmail: string, requestedPermissions: string[]) => {
  const isSandbox = isSandboxId(userId) || isSandboxId(partnerId);
  const request_id = isSandbox ? Math.random().toString(36).substr(2, 9) : `${userId}_${partnerId}`;
  
  const requestData: DPartnerRequest = {
    id: request_id,
    request_id,
    user_id: userId,
    partner_id: partnerId,
    partnerName,
    partnerEmail,
    requested_permissions: requestedPermissions,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  if (isSandbox) {
    const saved = localStorage.getItem('lumina_partner_requests');
    const list = saved ? JSON.parse(saved) : [];
    const filtered = list.filter((r: any) => !(r.user_id === userId && r.partner_id === partnerId));
    filtered.push(requestData);
    localStorage.setItem('lumina_partner_requests', JSON.stringify(filtered));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'lumina_partner_requests',
      newValue: JSON.stringify(filtered)
    }));
    return request_id;
  }
  
  const path = `partner_requests/${request_id}`;
  try {
    await setDoc(doc(db, "partner_requests", request_id), requestData);
    return request_id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updatePartnerRequestStatus = async (requestId: string, status: 'approved' | 'declined') => {
  const isSandbox = requestId.length < 15 || isSandboxId(requestId);
  
  if (isSandbox) {
    const saved = localStorage.getItem('lumina_partner_requests');
    const list = saved ? JSON.parse(saved) : [];
    const updated = list.map((r: any) => r.id === requestId ? { ...r, status } : r);
    localStorage.setItem('lumina_partner_requests', JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'lumina_partner_requests',
      newValue: JSON.stringify(updated)
    }));
    return;
  }
  
  const path = `partner_requests/${requestId}`;
  try {
    await updateDoc(doc(db, "partner_requests", requestId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getInvite = async (code: string) => {
  if (isSandboxId(code) || localStorage.getItem(`lumina_invite_${code}`)) {
    const inviteSnap = localStorage.getItem(`lumina_invite_${code}`);
    return inviteSnap ? JSON.parse(inviteSnap) : null;
  }
  try {
    const inviteSnap = await getDoc(doc(db, "invites", code));
    if (inviteSnap.exists()) {
      return inviteSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch invite details:", error);
    return null;
  }
};

export const completePartnerConnection = async (userId: string, partnerId: string, partnerName: string, userName: string) => {
  const isSandbox = isSandboxId(userId) || isSandboxId(partnerId);
  if (isSandbox) {
    const saved = localStorage.getItem('lumina_partner_requests');
    const list = saved ? JSON.parse(saved) : [];
    const updated = list.map((r: any) => 
      (r.user_id === userId && r.partner_id === partnerId) ? { ...r, status: 'approved' as const } : r
    );
    localStorage.setItem('lumina_partner_requests', JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'lumina_partner_requests',
      newValue: JSON.stringify(updated)
    }));
    return;
  }
  try {
    await updateDoc(doc(db, "users", userId), {
      partnerId,
      partnerName,
      isPartnerLinked: true
    });
    await updateDoc(doc(db, "users", partnerId), {
      partnerId: userId,
      partnerName: userName,
      isPartnerLinked: true
    });
  } catch (error) {
    console.error("Failed to complete partner connection in Firestore:", error);
  }
};

export const getCleanName = (name: string | undefined | null, email: string | undefined | null): string => {
  const isPlaceholder = (n: string | undefined | null) => {
    if (!n) return true;
    const lower = n.toLowerCase().trim();
    return lower === '' || lower === 'ella' || lower === 'demo user' || lower === 'test user' || lower === 'bloom member' || lower === 'null' || lower === 'undefined';
  };

  // 1. If we have a valid name
  if (name && !isPlaceholder(name)) {
    const cleanStr = name.trim();
    const firstWord = cleanStr.split(/[\s,.-]+/)[0];
    if (firstWord && !isPlaceholder(firstWord)) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
    return cleanStr;
  }

  // 2. If we have an email
  if (email && email.includes('@')) {
    const lowerEmail = email.toLowerCase();
    if (lowerEmail.includes('bernice')) {
      return 'Bernice';
    }
    const part = email.split('@')[0];
    if (part) {
      // Split by any non-alphabetic characters
      const cleanPart = part.replace(/[^a-zA-Z]/g, ' ');
      // Split camelCase or adjacent uppercase-lowercase boundaries
      const camelSplit = cleanPart.replace(/([a-z])([A-Z])/g, '$1 $2')
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
  if (!user) return 'Bernice';
  const clean = getCleanName(user.name, user.email);
  return clean || 'Bernice';
};

export const getSanctuaryTitle = (userOrPartner: { name?: string; email?: string } | null | undefined): string => {
  if (!userOrPartner) return "Your Partner's Sanctuary 🌸";
  const name = getCleanName(userOrPartner.name, userOrPartner.email);
  if (!name) return "Your Partner's Sanctuary 🌸";
  return `${name}'s Sanctuary 🌸`;
};

// --- GLOBAL PAYMENT CONFIGURATION FOR SIMULATOR TRANSFERS ---
export interface GlobalBankConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export const saveGlobalBankDetails = async (config: GlobalBankConfig) => {
  try {
    await setDoc(doc(db, "global_config", "payment"), config, { merge: true });
    localStorage.setItem("lumina_global_bank_config", JSON.stringify(config));
  } catch (err) {
    console.warn("Failed to save global bank config to Firestore:", err);
    localStorage.setItem("lumina_global_bank_config", JSON.stringify(config));
  }
};

export const getGlobalBankDetails = async (): Promise<GlobalBankConfig | null> => {
  try {
    const docSnap = await getDoc(doc(db, "global_config", "payment"));
    if (docSnap.exists()) {
      const data = docSnap.data() as GlobalBankConfig;
      localStorage.setItem("lumina_global_bank_config", JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn("Failed to fetch global bank config from Firestore:", err);
  }
  const cached = localStorage.getItem("lumina_global_bank_config");
  return cached ? JSON.parse(cached) : null;
};

export const blockPartner = async (userId: string, partnerIdToBlock: string, partnerDetails?: { id?: string; name?: string; email?: string }) => {
  if (!userId || !partnerIdToBlock) return;
  
  // First disconnect partner connection if currently connected
  await disconnectPartner(userId, partnerIdToBlock);

  if (isSandboxId(userId)) {
    const userRaw = localStorage.getItem(`lumina_user_${userId}`);
    if (userRaw) {
      const u: User = JSON.parse(userRaw);
      const existingBlocked = u.blockedPartners || [];
      const isAlreadyBlocked = existingBlocked.some(b => b.id === partnerIdToBlock);
      const newBlocked = isAlreadyBlocked ? existingBlocked : [
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
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      const u = userSnap.data() as User;
      const existingBlocked = u.blockedPartners || [];
      const isAlreadyBlocked = existingBlocked.some(b => b.id === partnerIdToBlock);
      const newBlocked = isAlreadyBlocked ? existingBlocked : [
        ...existingBlocked,
        {
          id: partnerIdToBlock,
          name: partnerDetails?.name || u.partnerName || 'Partner',
          email: partnerDetails?.email,
          dateBlocked: new Date().toISOString()
        }
      ];
      await updateDoc(doc(db, "users", userId), {
        partnerId: null,
        partnerName: '',
        isPartnerLinked: false,
        partnerRequest: null,
        blockedPartners: cleanUndefined(newBlocked)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
};

export const unblockPartner = async (userId: string, partnerIdToUnblock: string) => {
  if (!userId || !partnerIdToUnblock) return;

  if (isSandboxId(userId)) {
    const userRaw = localStorage.getItem(`lumina_user_${userId}`);
    if (userRaw) {
      const u: User = JSON.parse(userRaw);
      const existingBlocked = u.blockedPartners || [];
      const newBlocked = existingBlocked.filter(b => b.id !== partnerIdToUnblock);
      await syncUser({
        ...u,
        blockedPartners: newBlocked
      });
    }
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (userSnap.exists()) {
      const u = userSnap.data() as User;
      const existingBlocked = u.blockedPartners || [];
      const newBlocked = existingBlocked.filter(b => b.id !== partnerIdToUnblock);
      await updateDoc(doc(db, "users", userId), {
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
    const userRaw = localStorage.getItem(`lumina_user_${userId}`);
    if (userRaw) {
      const u: User = JSON.parse(userRaw);
      if (u.partnerId) {
        await disconnectPartner(userId, u.partnerId);
      }
    }
  } catch (e) {
    console.warn("Error disconnecting partner before delete:", e);
  }

  try {
    if (!isSandboxId(userId)) {
      await deleteDoc(doc(db, "users", userId));
    }
  } catch (error) {
    console.warn("Firestore user delete notice:", error);
  }

  try {
    if (auth.currentUser) {
      const { deleteUser } = await import('firebase/auth');
      await deleteUser(auth.currentUser);
    }
  } catch (authErr) {
    console.warn("Firebase auth deletion warning:", authErr);
  }

  localStorage.removeItem('lumina_user');
  localStorage.removeItem('lumina_biometric_user');
  localStorage.removeItem('lumina_saved_password');
  localStorage.removeItem(`lumina_user_${userId}`);
  sessionStorage.clear();
};

export const deletePartnerAccount = async (partnerId: string) => {
  return deleteUserAccount(partnerId);
};


