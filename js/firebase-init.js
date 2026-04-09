import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

let app = null;
try {
    const { firebaseConfig } = await import('./firebase-config.js');
    app = initializeApp(firebaseConfig);
} catch (e) {
    console.warn("Firebase config not found. Cloud features will be disabled.", e);
}

export { app };
