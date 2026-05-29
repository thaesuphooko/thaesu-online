import { NextResponse } from 'next/server';

// သစ်သီးဆိုင်တွင် ပြသမည့် ကုန်ပစ္စည်း စာရင်းများ
const products = [
  {
    id: 1,
    title: "လတ်ဆတ်သော သာကူသီး (Avocado)",
    price: 15000,
    description: "ရှမ်းပြည်နယ်တောင်ပိုင်း ထွက်၊ အနှစ်ပြည့်ပြီး ဆိမ့်အိနေသော ထိပ်တန်းအရည်အသွေး ထောပတ်သီးများ ဖြစ်ပါသည်။",
    image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: 2,
    title: "ရှယ်မန်းသီး မိတ္ထီလာအုပ် (Premium Mango)",
    price: 5000,
    description: "အနံ့မွှေးမွှေး၊ အသားထူထူနှင့် အရသာ အရမ်းချိုသော ရင်ကွဲသီး ရှယ်အလုံးကြီးများ ဖြစ်ပါသည်။",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: 3,
    title: "ထိုင်းလတ်ဆတ် ဒူးရင်းသီး (Monthong Durian)",
    price: 45000,
    description: "လတ်ဆတ်ပြီး အနံ့မွှေးကြိုင်ကာ အရသာအလွန်ရှိသော လွှာချင်းပြည့် ဒူးရင်းသီး ရှယ်အသားများ ဖြစ်ပါသည်။",
    image: "https://images.unsplash.com/photo-1695642731872-9cc1f4cbbeeb?w=500&auto=format&fit=crop&q=60"
  }
];

export async function GET() {
  return NextResponse.json(products);
}
