// lib/useWebRTC.js — Hook WebRTC untuk live location tracking via SSE
import { useEffect, useRef, useCallback, useState } from 'react';

export function useLocationBroadcast(userId, orderId) {
  const watchId = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  const broadcast = useCallback(async (lat, lng, accuracy) => {
    if (!userId || !orderId) return;
    try {
      await fetch('/api/webrtc/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: userId,
          type: 'location_update',
          payload: { lat, lng, accuracy, orderId, timestamp: Date.now() },
        }),
      });
    } catch (_) {}
  }, [userId, orderId]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setError('GPS tidak tersedia.'); return; }
    setIsTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => broadcast(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [broadcast]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  return { isTracking, error, startTracking, stopTracking };
}

export function useLocationReceiver(viewerUserId, onLocationUpdate) {
  const esRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [locations, setLocations] = useState({});

  useEffect(() => {
    if (!viewerUserId) return;
    const es = new EventSource(`/api/webrtc/signal?userId=${viewerUserId}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'location_update') {
          const { lat, lng, accuracy, orderId } = msg.payload;
          setLocations(prev => ({
            ...prev,
            [msg.from]: { lat, lng, accuracy, orderId, updatedAt: msg.timestamp },
          }));
          onLocationUpdate?.({ from: msg.from, lat, lng, accuracy, orderId });
        }
      } catch (_) {}
    };

    return () => { es.close(); setConnected(false); };
  }, [viewerUserId]);

  return { connected, locations };
}
