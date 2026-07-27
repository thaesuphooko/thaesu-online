import db from '@/lib/db';
import AdminSubscriptionsClient from './AdminSubscriptionsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionsPage() {
  // Single-pass optimized query with LEFT JOINs and aggregates
  const { rows: plans } = await db.query(`
    SELECT 
      sp.*,
      COUNT(us.id) FILTER (WHERE us.status IN ('ACTIVE', 'TRIALING'))::int AS active_subscribers,
      COUNT(us.id) FILTER (WHERE us.status = 'CANCELED')::int AS canceled_subscribers,
      COALESCE(SUM(spay.amount) FILTER (WHERE spay.status = 'succeeded'), 0)::numeric(10,2) AS total_revenue
    FROM subscription_plans sp
    LEFT JOIN user_subscriptions us ON us.plan_id = sp.id
    LEFT JOIN subscription_payments spay ON spay.subscription_id = us.id
    GROUP BY sp.id
    ORDER BY sp.sort_order ASC
  `);

  const totalActive = plans.reduce((sum, p) => sum + parseInt(p.active_subscribers), 0);
  const totalRevenue = plans.reduce((sum, p) => sum + parseFloat(p.total_revenue), 0);

  return (
    <AdminSubscriptionsClient 
      plans={plans} 
      totalActive={totalActive} 
      totalRevenue={totalRevenue} 
    />
  );
}
