importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDMO3B9o5Wsd5c42hSIpj_iiKL1wTLbJNg",
  authDomain: "protoveres-wiki.firebaseapp.com",
  projectId: "protoveres-wiki",
  storageBucket: "protoveres-wiki.firebasestorage.app",
  messagingSenderId: "164663077620",
  appId: "1:164663077620:web:3497f37ffed540b8520ca1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Protoveres";
  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "Có thông báo mới trên Protoveres.";

  const link =
    payload.data?.link ||
    "https://protoveres1secon.github.io/protover-wiki/";

  self.registration.showNotification(title, {
    body,
    icon: "https://protoveres1secon.github.io/protover-wiki/favicon-192.png",
    badge: "https://protoveres1secon.github.io/protover-wiki/favicon-192.png",
    data: { link }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification?.data?.link ||
    "https://protoveres1secon.github.io/protover-wiki/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(url);
          }
          return;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
