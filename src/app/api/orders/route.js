import { NextResponse } from 'next/server';

// အော်ဒါများကို ယာယီသိမ်းဆည်းထားမည့် Array Memory
global.savedOrders = global.savedOrders || [];

export async function GET() {
  return NextResponse.json(global.savedOrders);
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // ID နှင့် သတ်မှတ်ချက်များ ထည့်သွင်းခြင်း
    const newOrder = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      ...data
    };
    
    global.savedOrders.unshift(newOrder); // အသစ်ဆုံးအော်ဒါကို အပေါ်ဆုံးကပြရန်
    return NextResponse.json({ success: true, order: newOrder });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, status } = await request.json();
    
    // အော်ဒါ Status (Completed / Rejected) ကို ရှာဖွေပြင်ဆင်ခြင်း
    global.savedOrders = global.savedOrders.map(order => 
      order.id === id ? { ...order, status: status } : order
    );
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
