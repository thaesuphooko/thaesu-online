import { NextResponse } from 'next/server';
import { getMusicState, updateMusicState } from '@/lib/musicState';

export async function GET() {
  return NextResponse.json(await getMusicState());
}

export async function POST(req) {
  const body = await req.json();
  const current = await getMusicState();
  const newState = { ...current, ...body };
  await updateMusicState(newState);
  return NextResponse.json(newState);
}
