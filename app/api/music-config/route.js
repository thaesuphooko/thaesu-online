import { NextResponse } from 'next/server';
import { getMusicState, updateMusicState } from '@/lib/musicState';
export async function GET() { return NextResponse.json(getMusicState()); }
export async function POST(req) {
  const body = await req.json();
  return NextResponse.json(updateMusicState(body));
}
