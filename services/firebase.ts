import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust local caching.
// This ensures that even if Cloud Firestore is temporarily unreachable (due to sandbox network isolation or first-time setup delay),
// the application continues to run flawlessly in offline mode, storing and serving data locally.
// We also force/enable long polling to securely bypass WebSocket connection blockages typical in sandboxed preview environments.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth with a robust chain of local persistence managers.
// This allows the app to store authentication tokens directly under the first-party origin (e.g. *.run.app)
// without relying on third-party cookies or nested iframes, which are heavily blocked by mobile Safari/Chrome and private/incognito modes.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
});

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection Healthy");
  } catch (error: any) {
    const errCode = error?.code;
    const errMsg = error instanceof Error ? error.message : String(error);
    
    if (errCode === 'permission-denied' || errMsg.includes('permission-denied') || errMsg.includes('insufficient permissions')) {
      console.log("Firebase Connection Healthy (Security Rules Active and Active)");
    } else if (errMsg.includes('the client is offline') || errCode === 'unavailable') {
      console.warn("Firebase is operating in offline or retry mode. This is normal on initial load or if the sandbox environment is starting up.");
    } else {
      console.error("Firebase connection test details:", error);
    }
  }
}

testConnection();

export { OperationType };
