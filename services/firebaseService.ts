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
import { db, handleFirestoreError, OperationType } from './firebase';
import { User, ReceivedComfort } from '../types';

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

export const syncUser = async (user: User) => {
  if (user.id.startsWith('sandbox_')) {
    localStorage.setItem(`lumina_user_${user.id}`, JSON.stringify(user));
    // Trigger real-time storage event for local updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: `lumina_user_${user.id}`,
      newValue: JSON.stringify(user)
    }));
    return;
  }
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, "users", user.id), cleanUndefined(user), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const subscribeToUser = (userId: string, callback: (user: User | null) => void) => {
  if (userId.startsWith('sandbox_')) {
    const localData = localStorage.getItem(`lumina_user_${userId}`);
    callback(localData ? JSON.parse(localData) : null);

    const listener = (e: StorageEvent) => {
      if (e.key === `lumina_user_${userId}`) {
        callback(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
  const path = `users/${userId}`;
  return onSnapshot(doc(db, "users", userId), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as User);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const createInvite = async (userId: string, userName: string) => {
  if (userId.startsWith('sandbox_')) {
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const inviteData = {
      code,
      senderId: userId,
      senderName: userName,
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
      createdAt: new Date().toISOString()
    });
    return code;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const acceptInvite = async (code: string, currentUserId: string, currentUserName: string) => {
  if (currentUserId.startsWith('sandbox_')) {
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
  if (userId.startsWith('sandbox_')) {
    const userRaw = localStorage.getItem(`lumina_user_${userId}`);
    if (userRaw) {
      const u = JSON.parse(userRaw);
      await syncUser({
        ...u,
        partnerId: undefined,
        partnerName: '',
        isPartnerLinked: false,
        isPartner: false
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
      isPartnerLinked: false,
      isPartner: false
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
  if (senderId.startsWith('sandbox_') || receiverId.startsWith('sandbox_')) {
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
  if (userId.startsWith('sandbox_')) {
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
  requested_permissions: string[];
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
}

export const subscribeToPartnerRequests = (roleId: string, role: 'user' | 'partner', callback: (requests: DPartnerRequest[]) => void) => {
  if (roleId.startsWith('sandbox_')) {
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

export const submitPartnerRequest = async (userId: string, partnerId: string, partnerName: string, requestedPermissions: string[]) => {
  const isSandbox = userId.startsWith('sandbox_') || partnerId.startsWith('sandbox_');
  const request_id = isSandbox ? Math.random().toString(36).substr(2, 9) : `${userId}_${partnerId}`;
  
  const requestData: DPartnerRequest = {
    id: request_id,
    request_id,
    user_id: userId,
    partner_id: partnerId,
    partnerName,
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
  const isSandbox = requestId.length < 15 || requestId.startsWith('sandbox_');
  
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
  if (code.startsWith('sandbox_') || localStorage.getItem(`lumina_invite_${code}`)) {
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
  const isSandbox = userId.startsWith('sandbox_') || partnerId.startsWith('sandbox_');
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


