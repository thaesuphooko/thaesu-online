'use client';
export default function ProductTour({ steps }) {
  return <div className="fixed bottom-4 right-4 z-50"><button onClick={() => alert('Tour will start in production with Shepherd.js')} className="px-4 py-2 bg-accent text-white rounded-full">Start Tour</button></div>;
}
