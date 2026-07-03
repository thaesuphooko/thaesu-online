import { NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    return NextResponse.json({ audioUrl: format.url, title: info.videoDetails.title });
  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
