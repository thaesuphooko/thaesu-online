'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const icons = ['🎮','🎲','🎯','🎸','🎨','🎭','🎪','🎟️'];

export default function MemoryGame() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => { shuffleCards(); }, []);

  const shuffleCards = () => {
    const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
    setCards(deck);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  const handleFlip = (index) => {
    if (flipped.length === 2 || matched.includes(index) || flipped.includes(index)) return;
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m+1);
      if (cards[newFlipped[0]] === cards[newFlipped[1]]) {
        setMatched(prev => [...prev, newFlipped[0], newFlipped[1]]);
      }
      setTimeout(() => setFlipped([]), 800);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6">Memory Match</h1>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((icon, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            onClick={() => handleFlip(i)}
            className={`w-20 h-20 rounded-xl text-3xl flex items-center justify-center ${
              matched.includes(i) ? 'bg-green-600' : flipped.includes(i) ? 'bg-purple-600' : 'bg-zinc-800'
            }`}
          >
            {flipped.includes(i) || matched.includes(i) ? icon : '?'}
          </motion.button>
        ))}
      </div>
      <p className="mt-4 text-sm text-zinc-400">Moves: {moves}</p>
      <button onClick={shuffleCards} className="mt-4 px-4 py-2 bg-purple-600 rounded-xl">New Game</button>
    </div>
  );
}
