import { NextResponse } from 'next/server';
export async function POST(req) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });
  try {
    const apiRes = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, audioFormat: 'mp3', isAudioOnly: true }),
    });
    const data = await apiRes.json();
    if (data.url) return NextResponse.json({ audioUrl: data.url, title: data.filename || 'YouTube Audio' });
  } catch (e) {}
  return NextResponse.json({ error: 'Extraction failed. Use direct URL.' }, { status: 422 });
}
