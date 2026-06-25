import GlassCard from '@/components/atoms/GlassCard';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* TrueTone Glassmorphism Hero */}
      <GlassCard className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          ကမ္ဘာ့အဆင့်မီ <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-purple-600">Thaesu Online</span>
        </h1>
        <p className="text-lg opacity-80">
          Premium Marketplace &bull; 100,000+ Products &bull; Light-speed Search
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition">
            ဈေးဝယ်မယ်
          </button>
          <button className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:scale-105 transition">
            ဆိုင်ဖွင့်မယ်
          </button>
        </div>
      </GlassCard>

      {/* Features Grid */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <GlassCard className="text-center space-y-3">
          <span className="text-4xl">⚡</span>
          <h3 className="text-xl font-semibold">မြန်ဆန်မှု</h3>
          <p className="text-sm opacity-70">GIN Index နဲ့ ထုတ်ကုန်ပေါင်း ၁သိန်းကို စက္ကန့်ပိုင်းအတွင်း ရှာဖွေနိုင်တယ်။</p>
        </GlassCard>
        <GlassCard className="text-center space-y-3">
          <span className="text-4xl">🛡️</span>
          <h3 className="text-xl font-semibold">လုံခြုံရေး</h3>
          <p className="text-sm opacity-70">Enterprise-grade Security၊ Time-Gate 18+ ကာကွယ်မှု။</p>
        </GlassCard>
        <GlassCard className="text-center space-y-3">
          <span className="text-4xl">🎨</span>
          <h3 className="text-xl font-semibold">TrueTone UI</h3>
          <p className="text-sm opacity-70">အချိန်နှင့်လိုက်ပြီး အရောင်ပြောင်းတဲ့ Glassmorphism ဒီဇိုင်း။</p>
        </GlassCard>
      </div>
    </main>
  );
}
