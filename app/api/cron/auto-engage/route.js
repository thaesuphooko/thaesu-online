import { NextResponse } from 'next/server';
import { processEngagementTasks } from '@/lib/autoEngage';

export async function GET(request) {
  try {
    await processEngagementTasks();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
