'use client';
import { useEffect, useState } from 'react';
import { MapPin, Bike } from 'lucide-react';

export default function FakeDeliveryMap() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[400px] bg-cover bg-center rounded-2xl overflow-hidden border"
      style={{ backgroundImage: 'url(https://staticmap.openstreetmap.de/staticmap.php?center=16.8409,96.1735&zoom=14&size=800x400&maptype=mapnik)' }}
    >
      {/* Animated Bike */}
      <div className="absolute" style={{ left: `${10 + progress * 0.6}%`, bottom: `${20 + Math.sin(progress * 0.1) * 10}%`, transition: 'left 1s, bottom 1s' }}>
        <div className="relative">
          <Bike className="w-8 h-8 text-orange-500 drop-shadow-lg" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
        </div>
      </div>

      {/* Store Marker */}
      <div className="absolute bottom-10 left-5 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
        <MapPin className="w-4 h-4 text-red-500" />
        Store
      </div>

      {/* Customer Marker */}
      <div className="absolute top-10 right-5 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
        <MapPin className="w-4 h-4 text-blue-500" />
        You
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-4 left-4 right-4 glass-card p-3">
        <div className="flex justify-between text-xs mb-1">
          <span>Preparing</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Estimated delivery: 15-25 min</p>
      </div>
    </div>
  );
}
