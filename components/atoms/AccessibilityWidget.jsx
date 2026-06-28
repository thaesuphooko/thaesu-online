'use client';
import { useState } from 'react';
export default function AccessibilityWidget() {
  const [fontSize, setFontSize] = useState(16);
  return (
    <div className="fixed bottom-4 left-4 z-50 glass-card p-2 flex gap-2">
      <button onClick={() => setFontSize(prev => Math.min(prev + 2, 24))} className="px-2 bg-primary text-primary-foreground rounded">A+</button>
      <button onClick={() => setFontSize(prev => Math.max(prev - 2, 12))} className="px-2 bg-primary text-primary-foreground rounded">A-</button>
      <style>{`body { font-size: ${fontSize}px; }`}</style>
    </div>
  );
}
