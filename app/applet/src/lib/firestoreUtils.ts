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
  };
}

let quotaExceededListeners: ((exceeded: boolean) => void)[] = [];
export const isFirestoreQuotaExceeded = false;

export function onQuotaStateChange(listener: (exceeded: boolean) => void) {
  quotaExceededListeners.push(listener);
  listener(false);
  return () => {
    quotaExceededListeners = quotaExceededListeners.filter(l => l !== listener);
  };
}

export function setQuotaExceededState(_exceeded: boolean) {
  // Always false to prevent any banner from showing
}

export function isQuotaError(error: unknown): boolean {
  return false;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // Suppress completely
}
