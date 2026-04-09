import { app } from './firebase-init.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

export const db = app ? getFirestore(app) : null;
export * from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
