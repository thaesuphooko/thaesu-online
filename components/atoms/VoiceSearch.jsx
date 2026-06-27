'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function VoiceSearch() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const router = useRouter();

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'my-MM'; // Myanmar language; fallback 'en-US'
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      router.push(`/products?search=${encodeURIComponent(transcript)}`);
    };
    recognition.onerror = (event) => {
      setListening(false);
      console.error(event.error);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <button
      onClick={startListening}
      className={`p-2 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'} text-white`}
      title="Voice Search"
    >
      🎤
    </button>
  );
}
