import { app } from './firebase-init.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

export const storage = app ? getStorage(app) : null;
export * from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';
