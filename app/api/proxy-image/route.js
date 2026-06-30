export const dynamic = 'force-dynamic';
import axios from 'axios';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let imageUrl = searchParams.get('url');
  if (!imageUrl) return new Response('Missing url', { status: 400 });

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': new URL(imageUrl).origin,
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      timeout: 10000,
      maxRedirects: 5,
    });
    
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return new Response(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return new Response('Image not found', { status: 404 });
  }
}
