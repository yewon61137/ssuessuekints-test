import { app } from './firebase-init.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

export const auth = app ? getAuth(app) : null;
export * from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
