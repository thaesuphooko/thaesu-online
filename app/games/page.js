'use client';
import { useState, useEffect } from 'react';
export default function FlappyBirdPage() {
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState([]);
  useEffect(() => {
    fetch('/api/games?game=flappy').then(r => r.json()).then(setHighScores);
  }, []);
  return (
    <div className="max-w-2xl mx-auto p-4 text-center">
      <h1 className="text-3xl font-bold mb-6">Flappy Bird</h1>
      <div className="glass-card p-8 h-64 flex items-center justify-center text-4xl">🐦</div>
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Leaderboard</h2>
        {highScores.map((s, i) => (
          <div key={i} className="flex justify-between p-2 glass-card mb-1">
            <span>{s.full_name}</span><span className="font-bold">{s.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
