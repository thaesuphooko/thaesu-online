'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RefreshCw, Trophy } from 'lucide-react';

export default function SnakeGame() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('playing'); // playing | paused | over
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const directionRef = useRef({ x: 1, y: 0 });
  const snakeRef = useRef([{ x: 5, y: 5 }]);
  const foodRef = useRef({ x: 10, y: 10 });
  const intervalRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('snake_highscore');
    if (stored) setHighScore(parseInt(stored));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    const cols = canvas.width / gridSize;
    const rows = canvas.height / gridSize;

    const generateFood = () => {
      let pos;
      do {
        pos = {
          x: Math.floor(Math.random() * cols),
          y: Math.floor(Math.random() * rows),
        };
      } while (snakeRef.current.some(s => s.x === pos.x && s.y === pos.y));
      foodRef.current = pos;
    };

    const draw = () => {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grid lines
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
      }

      // Food glow
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(foodRef.current.x * gridSize + gridSize/2, foodRef.current.y * gridSize + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snake
      snakeRef.current.forEach((segment, index) => {
        const alpha = 1 - (index / snakeRef.current.length) * 0.5;
        ctx.fillStyle = index === 0 ? '#a855f7' : `rgba(34, 197, 94, ${alpha})`;
        ctx.shadowColor = index === 0 ? '#a855f7' : '#22c55e';
        ctx.shadowBlur = index === 0 ? 15 : 5;
        ctx.beginPath();
        ctx.roundRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2, 4);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    };

    const update = () => {
      const head = snakeRef.current[0];
      const newHead = {
        x: head.x + directionRef.current.x,
        y: head.y + directionRef.current.y,
      };

      if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
        gameOver();
        return;
      }
      if (snakeRef.current.some(s => s.x === newHead.x && s.y === newHead.y)) {
        gameOver();
        return;
      }

      snakeRef.current.unshift(newHead);

      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(prev => {
          const newScore = prev + 10;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('snake_highscore', newScore.toString());
          }
          return newScore;
        });
        generateFood();
      } else {
        snakeRef.current.pop();
      }
      draw();
    };

    const gameOver = () => {
      setGameState('over');
      clearInterval(intervalRef.current);
    };

    generateFood();
    draw();

    const handleKey = (e) => {
      e.preventDefault();
      const dir = directionRef.current;
      if (e.key === 'ArrowUp' && dir.y === 0) { directionRef.current = { x: 0, y: -1 }; }
      else if (e.key === 'ArrowDown' && dir.y === 0) { directionRef.current = { x: 0, y: 1 }; }
      else if (e.key === 'ArrowLeft' && dir.x === 0) { directionRef.current = { x: -1, y: 0 }; }
      else if (e.key === 'ArrowRight' && dir.x === 0) { directionRef.current = { x: 1, y: 0 }; }
    };

    document.addEventListener('keydown', handleKey);

    const startGame = () => {
      intervalRef.current = setInterval(update, 120);
    };
    const pauseGame = () => {
      clearInterval(intervalRef.current);
    };

    if (gameState === 'playing') startGame();
    else if (gameState === 'paused') pauseGame();

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('keydown', handleKey);
    };
  }, [gameState, highScore]);

  const restart = () => {
    snakeRef.current = [{ x: 5, y: 5 }];
    directionRef.current = { x: 1, y: 0 };
    setScore(0);
    setGameState('playing');
  };

  const togglePause = () => {
    setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 text-white flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="text-center mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-green-400 bg-clip-text text-transparent">
          Snake 2.0
        </h1>
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-1 text-sm">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-zinc-400">Score:</span>
            <span className="font-bold text-white">{score}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Trophy className="w-4 h-4 text-purple-400" />
            <span className="text-zinc-400">Best:</span>
            <span className="font-bold text-white">{highScore}</span>
          </div>
        </div>
      </motion.div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="border-2 border-zinc-700 rounded-2xl shadow-2xl shadow-purple-500/20"
          onClick={togglePause}
        />
        
        {gameState === 'over' && (
          <motion.div
            initial={{ opacity:0, scale:0.8 }}
            animate={{ opacity:1, scale:1 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center"
          >
            <p className="text-3xl font-bold text-red-400 mb-2">Game Over!</p>
            <p className="text-lg text-zinc-300 mb-4">Score: {score}</p>
            <button onClick={restart} className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition shadow-lg">
              <RefreshCw className="w-5 h-5" /> Play Again
            </button>
          </motion.div>
        )}

        {gameState === 'paused' && (
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex items-center justify-center"
          >
            <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-6 text-center">
              <p className="text-2xl font-bold mb-3">⏸️ Paused</p>
              <p className="text-zinc-400 text-sm">Tap to resume</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="grid grid-cols-3 gap-2 mt-6 md:hidden">
        <div />
        <button onTouchStart={() => directionRef.current = { x: 0, y: -1 }} className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700">
          <ArrowUp className="w-6 h-6 mx-auto" />
        </button>
        <div />
        <button onTouchStart={() => directionRef.current = { x: -1, y: 0 }} className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700">
          <ArrowLeft className="w-6 h-6 mx-auto" />
        </button>
        <button onClick={togglePause} className="p-4 bg-purple-600 rounded-xl font-bold">
          {gameState === 'playing' ? '⏸' : '▶'}
        </button>
        <button onTouchStart={() => directionRef.current = { x: 1, y: 0 }} className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700">
          <ArrowRight className="w-6 h-6 mx-auto" />
        </button>
        <div />
        <button onTouchStart={() => directionRef.current = { x: 0, y: 1 }} className="p-4 bg-zinc-800 rounded-xl active:bg-zinc-700">
          <ArrowDown className="w-6 h-6 mx-auto" />
        </button>
        <div />
      </div>

      <p className="text-xs text-zinc-500 mt-4">Use arrow keys or tap canvas to pause</p>
    </div>
  );
}
