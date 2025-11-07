import { useSyncExternalStore } from 'react';
import { getRootDocHandleSync } from '../lib/automerge-repo';

/**
 * The subscribe function for useSyncExternalStore.
 * It safely gets the initialized handle and subscribes to its 'change' event.
 */
function subscribe(callback: () => void) {
  const handle = getRootDocHandleSync();
  handle.on('change', callback);
  return () => handle.off('change', callback);
}

/**
 * The getSnapshot function for useSyncExternalStore.
 * It safely gets the initialized handle and returns the current document state.
 */
function getSnapshot() {
  const handle = getRootDocHandleSync();
  return handle.docSync();
}

/**
 * A hook that provides a reactive view of the Automerge document.
 * It uses useSyncExternalStore to subscribe to document changes and
 * trigger re-renders in React components only when the data has changed.
 * This hook should only be used in components rendered *after* the
 * initialization in App.tsx is complete.
 */
export function useDocument<T>(): T | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as T | undefined;
}
