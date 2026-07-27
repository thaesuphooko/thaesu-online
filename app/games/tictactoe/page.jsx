'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isX, setIsX] = useState(true);
  const winner = calculateWinner(board);

  const handleClick = (i) => {
    if (winner || board[i]) return;
    const newBoard = [...board];
    newBoard[i] = isX ? 'X' : 'O';
    setBoard(newBoard);
    setIsX(!isX);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsX(true);
  };

  const status = winner ? `Winner: ${winner}` : board.every(Boolean) ? "Draw!" : `Next: ${isX ? 'X' : 'O'}`;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6">Tic Tac Toe</h1>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {board.map((val, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleClick(i)}
            className="w-24 h-24 bg-zinc-800 rounded-2xl text-4xl font-bold flex items-center justify-center text-purple-400"
          >
            {val}
          </motion.button>
        ))}
      </div>
      <p className="text-xl mb-4">{status}</p>
      <button onClick={reset} className="px-6 py-2 bg-purple-600 rounded-xl">New Game</button>
    </div>
  );
}

function calculateWinner(squares) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
  ];
  for (let [a,b,c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  return null;
}
