import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ReviewsCarousel from '@/components/organisms/ReviewsCarousel';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 animate-fadeIn">
      <Card className="max-w-4xl w-full text-center !bg-transparent !border-none !shadow-none">
        <CardHeader className="items-center">
          <CardTitle className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
            Thaesu Online
          </CardTitle>
          <CardDescription className="text-xl max-w-xl">
            ကမ္ဘာ့အဆင့်မီ Marketplace • ထုတ်ကုန်ပေါင်း ၁၀၀,၀၀၀+ • အလွန်မြန်ဆန်သော ရှာဖွေမှု
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-4 justify-center mb-12">
        <Link href="/products">
          <Button variant="glass" size="lg" className="text-lg gap-2">
            🛍️ ဈေးဝယ်မယ်
          </Button>
        </Link>
        <Link href="/vendor/register">
          <Button variant="glass" size="lg" className="text-lg gap-2">
            🏪 ဆိုင်ဖွင့်မယ်
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {[
          { icon: '⚡', title: 'မြန်ဆန်မှု', desc: 'GIN Index ဖြင့် ထုတ်ကုန်ပေါင်း ၁သိန်းကို စက္ကန့်ပိုင်းအတွင်း ရှာဖွေနိုင်သည်။' },
          { icon: '🛡️', title: 'လုံခြုံရေး', desc: 'Enterprise-grade Security၊ Time-Gate 18+ ကာကွယ်မှု။' },
          { icon: '🎨', title: 'TrueTone UI', desc: 'အချိန်နှင့်လိုက်၍ အရောင်ပြောင်းသော Glassmorphism ဒီဇိုင်း။' },
        ].map((f, i) => (
          <Card key={i} className="text-center hover:shadow-glass-hover">
            <CardHeader>
              <span className="text-4xl">{f.icon}</span>
              <CardTitle className="text-xl">{f.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{f.desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Customer Reviews Section */}
      <div className="w-full max-w-7xl mt-16">
        <h2 className="text-3xl font-bold text-center mb-8">What Our Customers Say</h2>
        <ReviewsCarousel />
      </div>
    </main>
  );
}
