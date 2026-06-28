export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
export async function GET(request) {
  const game = new URL(request.url).searchParams.get('game') || 'flappy';
  const res = await query('SELECT u.full_name, gs.score, gs.created_at FROM game_scores gs JOIN users u ON u.id=gs.user_id WHERE gs.game_name=$1 ORDER BY gs.score DESC LIMIT 20', [game]);
  return Response.json(res.rows);
}
export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Login required' }, { status: 401 });
  const user = verifyToken(authHeader.split(' ')[1]);
  const { game_name, score } = await request.json();
  await query('INSERT INTO game_scores (user_id, game_name, score) VALUES ($1,$2,$3)', [user.id, game_name, score]);
  return Response.json({ message: 'Score saved' }, { status: 201 });
}
