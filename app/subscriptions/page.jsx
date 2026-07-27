import db from '@/lib/db';
import SubscriptionsClient from './SubscriptionsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // ISR: revalidate every 60 seconds

async function getPlans() {
  try {
    const { rows: plans } = await db.query(`
      SELECT sp.*,
        COALESCE(json_agg(json_build_object(
          'id', spp.id, 'product_id', spp.product_id, 'quantity', spp.quantity,
          'product', json_build_object('id', p.id, 'title', p.title, 'price', p.price)
        )) FILTER (WHERE spp.id IS NOT NULL), '[]') AS box_products
      FROM subscription_plans sp
      LEFT JOIN subscription_plan_products spp ON sp.id = spp.plan_id
      LEFT JOIN products p ON spp.product_id = p.id
      WHERE sp.is_active = true
      GROUP BY sp.id
      ORDER BY sp.sort_order ASC
    `);
    return plans;
  } catch (error) {
    console.error('Subscription plans query failed:', error);
    return []; // Return empty so the client can show "No plans" UI
  }
}

export default async function SubscriptionsPage() {
  const plans = await getPlans();
  return <SubscriptionsClient plans={plans} />;
}
