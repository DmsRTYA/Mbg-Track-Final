// components/LiveLocationMap.js — WebRTC Live Location Tracker
import { useEffect, useRef, useState } from 'react';
import { MapPin, Wifi, WifiOff, Navigation } from 'lucide-react';

export default function LiveLocationMap({ locations = {}, orderId }) {
  const mapRef = useRef(null);
  const [activeLocations, setActiveLocations] = useState([]);

  useEffect(() => {
    const active = Object.entries(locations)
      .filter(([, v]) => v.orderId === orderId || !orderId)
      .map(([from, v]) => ({ from, ...v }));
    setActiveLocations(active);
  }, [locations, orderId]);

  if (activeLocations.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center">
        <MapPin size={28} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-400 font-medium">Kurir belum berbagi lokasi</p>
        <p className="text-xs text-slate-300 mt-1">Lokasi real-time akan muncul di sini</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeLocations.map((loc) => {
        const age = Date.now() - loc.updatedAt;
        const isRecent = age < 30000;
        const mapsUrl = `https://maps.google.com/?q=${loc.lat},${loc.lng}`;
        return (
          <div key={loc.from} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isRecent
                  ? <Wifi size={14} className="text-green-500" />
                  : <WifiOff size={14} className="text-slate-400" />}
                <span className="text-xs font-semibold text-slate-700">
                  {isRecent ? 'Live' : 'Terakhir'}
                </span>
                <span className="text-xs text-slate-400">
                  {Math.round(age / 1000)}s lalu
                </span>
              </div>
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                <Navigation size={12} /> Buka Maps
              </a>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
            </div>
            {loc.accuracy && (
              <div className="text-xs text-slate-400 mt-0.5">
                Akurasi: ±{Math.round(loc.accuracy)}m
              </div>
            )}
            {/* Embedded static map via OpenStreetMap */}
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="block mt-2">
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${loc.lat},${loc.lng}&zoom=15&size=400x120&markers=${loc.lat},${loc.lng},red`}
                alt="Lokasi Kurir"
                className="w-full h-24 object-cover rounded-lg"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </a>
          </div>
        );
      })}
    </div>
  );
}
