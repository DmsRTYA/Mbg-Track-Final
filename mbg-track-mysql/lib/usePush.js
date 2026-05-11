// lib/usePush.js — React hook untuk Web Push subscription
import { useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : '';
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotification(user) {
  const subscribe = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (!user?.id) return;

    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Minta izin notifikasi
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Subscribe ke push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });

      const sub = subscription.toJSON();

      // Kirim ke server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
          userAgent: navigator.userAgent,
        }),
      });

      console.log('[Push] Subscribed successfully');
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err.message);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) subscribe();
  }, [user?.id, subscribe]);

  // Listen for notification clicks dari SW
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
        window.location.href = event.data.url;
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, []);

  return { subscribe };
}
