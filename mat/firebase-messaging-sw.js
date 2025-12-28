// Firebase Messaging Service Worker (optional for FCM web push)
// This file is used only if you enable FCM and request notification permissions.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// NOTE: Because service workers can't access your page scope, we need firebase config here.
// For demo: we read it from a global injected by a tiny generated file (firebase-sw-config.js).
importScripts('./firebase-sw-config.js');

firebase.initializeApp(self.FIREBASE_SW_CONFIG);

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'SmartMat 通知';
  const options = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || undefined
  };
  self.registration.showNotification(title, options);
});
