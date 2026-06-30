export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import ytdl from 'ytdl-core';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const res = await query("SELECT key, value FROM global_settings WHERE key IN ('music_url','music_volume','music_loop')");
  const settings = {};
  res.rows.forEach(r => { settings[r.key] = r.value; });
  return Response.json(settings);
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const formData = await request.formData();
  const file = formData.get('file');
  const youtubeUrl = formData.get('youtube_url');
  const volume = formData.get('volume') || '0.3';
  const loop = formData.get('loop') || 'true';

  let audioUrl = '';

  if (file && file.size > 0) {
    // Save uploaded file to public/audio/
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = Date.now() + '-' + file.name;
    const filepath = path.join(process.cwd(), 'public', 'audio', filename);
    await writeFile(filepath, buffer);
    audioUrl = '/audio/' + filename;
  } else if (youtubeUrl) {
    // Extract audio from YouTube (stream to file)
    try {
      const filename = 'yt-audio-' + Date.now() + '.mp3';
      const filepath = path.join(process.cwd(), 'public', 'audio', filename);
      const stream = ytdl(youtubeUrl, { filter: 'audioonly', quality: 'highestaudio' });
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      await writeFile(filepath, Buffer.concat(chunks));
      audioUrl = '/audio/' + filename;
    } catch (e) {
      return Response.json({ error: 'YouTube download failed: ' + e.message }, { status: 400 });
    }
  } else {
    return Response.json({ error: 'No file or YouTube URL provided' }, { status: 400 });
  }

  // Update settings
  await query("INSERT INTO global_settings (key, value) VALUES ('music_url', $1), ('music_volume', $2), ('music_loop', $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [audioUrl, volume, loop]);
  return Response.json({ message: 'Music updated', url: audioUrl });
}
