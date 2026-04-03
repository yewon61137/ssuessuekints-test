import { app } from './firebase-init.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

export const storage = getStorage(app);
export * from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';
