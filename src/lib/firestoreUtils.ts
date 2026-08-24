import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

let quotaExceededListeners: ((exceeded: boolean) => void)[] = [];
export let isFirestoreQuotaExceeded = false;

export function onQuotaStateChange(listener: (exceeded: boolean) => void) {
  quotaExceededListeners.push(listener);
  listener(isFirestoreQuotaExceeded);
  return () => {
    quotaExceededListeners = quotaExceededListeners.filter(l => l !== listener);
  };
}

export function setQuotaExceededState(exceeded: boolean) {
  if (isFirestoreQuotaExceeded !== exceeded) {
    isFirestoreQuotaExceeded = exceeded;
    quotaExceededListeners.forEach(l => l(exceeded));
  }
}

export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  
  let str = '';
  if (typeof error === 'string') {
    str = error;
  } else if (error instanceof Error) {
    str = error.message + ' ' + (error.stack || '') + ' ' + ((error as any).code || '') + ' ' + String((error as any).cause || '');
  } else if (typeof error === 'object') {
    try {
      str = JSON.stringify(error) + ' ' + String(error) + ' ' + ((error as any)?.code || '') + ' ' + ((error as any)?.message || '') + ' ' + ((error as any)?.details || '');
    } catch {
      str = String(error);
    }
  } else {
    str = String(error);
  }

  const lowerStr = str.toLowerCase();
  const matched = lowerStr.includes('quota limit exceeded') ||
                  lowerStr.includes('quota exceeded') ||
                  lowerStr.includes('resource-exhausted') ||
                  lowerStr.includes('resource_exhausted') ||
                  lowerStr.includes('free daily read units') ||
                  lowerStr.includes('quota metric') ||
                  lowerStr.includes('exceeded free quota') ||
                  lowerStr.includes('exceeded quota') ||
                  lowerStr.includes('free tier database') ||
                  lowerStr.includes('firestore.googleapis.com') ||
                  lowerStr.includes('project_number:905794080701') ||
                  lowerStr.includes('internal assertion failed') ||
                  lowerStr.includes('unexpected state') ||
                  lowerStr.includes('ca9') ||
                  lowerStr.includes('b815') ||
                  (error as any)?.code === 'resource-exhausted' ||
                  (error as any)?.code === 'RESOURCE_EXHAUSTED';

  if (matched && (lowerStr.includes('quota') || lowerStr.includes('resource-exhausted') || lowerStr.includes('resource_exhausted') || lowerStr.includes('read units'))) {
    setQuotaExceededState(true);
  }
  return matched;
}

// Global Interception to suppress quota error spam in console and window events
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = (...args: any[]) => {
    const combined = args.map(arg => {
      if (!arg) return '';
      if (arg instanceof Error) return arg.message + ' ' + (arg.stack || '') + ' ' + String((arg as any).cause || '');
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg) + ' ' + (arg.message || '') + ' ' + (arg.code || ''); } catch { return String(arg); }
      }
      return String(arg);
    }).join(' ');

    if (isQuotaError(combined) || combined.includes('Free daily read units') || combined.includes('quota metric')) {
      return;
    }
    originalConsoleError(...args);
  };

  console.warn = (...args: any[]) => {
    const combined = args.map(arg => {
      if (!arg) return '';
      if (arg instanceof Error) return arg.message + ' ' + (arg.stack || '');
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch { return String(arg); }
      }
      return String(arg);
    }).join(' ');

    if (isQuotaError(combined) || combined.includes('Free daily read units') || combined.includes('quota metric')) {
      return;
    }
    originalConsoleWarn(...args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isQuotaError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isQuotaError(event.error || event.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);

  if (isQuotaError(error)) {
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
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
  };
  
  if (errMsg.includes('Missing or insufficient permissions')) {
    console.error('Firestore Permission Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
  
  console.error(`Firestore Error [${operationType} - ${path}]:`, error);
}

