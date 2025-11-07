import { Repo, DocHandle, DocumentId } from "@automerge/automerge-repo";
import { LocalStorageStoreAdapter } from "@automerge/automerge-repo-storage-localstorage";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";

import {
  Product,
  UserPreferences,
  Movements,
  ManualMovement,
  AuditEntry,
} from '../types';
import { INITIAL_CATEGORIES } from '../constants';

// Define the schema for our Automerge document. This helps with type safety.
export interface AppDoc {
  products: Product[];
  preferences: UserPreferences;
  ignoredProductIds: string[];
  allCategories: string[];
  movements: Movements;
  manualMovements: ManualMovement[];
  auditLog: AuditEntry[];
}

// Create a single, shared repo instance.
const repo = new Repo({
  // The BroadcastChannel network adapter allows for real-time sync between browser tabs.
  network: [new BroadcastChannelNetworkAdapter()],
  // The LocalStorage storage adapter persists the repo's state, making it available offline.
  storage: new LocalStorageStoreAdapter(),
});

// A variable to hold our single document handle and a promise for its initialization.
let rootDocHandle: DocHandle<AppDoc> | null = null;
let rootDocHandlePromise: Promise<DocHandle<AppDoc>> | null = null;


/**
 * Returns the synchronized document handle.
 * Throws an error if called before initialization is complete.
 */
export const getRootDocHandleSync = (): DocHandle<AppDoc> => {
  if (!rootDocHandle) {
    throw new Error("Doc handle not initialized. Call initializeRootDocHandle first.");
  }
  return rootDocHandle;
};

/**
 * Retrieves or creates the root document handle for the application.
 * This function is idempotent: it will only create the repo and document once,
 * returning the same promise for concurrent calls.
 */
export const initializeRootDocHandle = (): Promise<DocHandle<AppDoc>> => {
  // If the handle is already created, return a resolved promise immediately.
  if (rootDocHandle) {
    return Promise.resolve(rootDocHandle);
  }

  // If initialization is already in progress, return the existing promise.
  if (rootDocHandlePromise) {
    return rootDocHandlePromise;
  }
  
  // Start initialization.
  rootDocHandlePromise = (async () => {
    const docId = "alkima-mizu-automerge-doc" as DocumentId;
    
    // `repo.find` is synchronous and returns a handle immediately.
    const handle = repo.find<AppDoc>(docId);
  
    // Use whenReady() to wait for the document to be loaded from storage or network.
    await handle.whenReady();
    const doc = handle.docSync();
  
    // If the document is empty or new, initialize it with a default structure.
    if (!doc || Object.keys(doc).length === 0) {
      handle.change(d => {
        d.products = [];
        d.preferences = {
          viewMode: 'grid', searchTerm: '', selectedCategory: 'Todas', showAvailableOnly: false, showIgnoredOnly: false,
        };
        d.ignoredProductIds = ['banner'];
        d.allCategories = INITIAL_CATEGORIES;
        d.movements = {};
        d.manualMovements = [];
        d.auditLog = [];
      });
    }
  
    // Store the handle in our singleton variable for sync access later.
    rootDocHandle = handle;
    return handle;
  })();

  return rootDocHandlePromise;
};