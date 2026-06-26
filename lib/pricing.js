import { query } from './db.js';

// Apply all active rules to a product's base price
export async function getDynamicPrice(product, basePrice) {
  const rules = await query(
    'SELECT * FROM pricing_rules WHERE is_active = true ORDER BY priority DESC'
  );
  let finalPrice = basePrice;
  for (const rule of rules.rows) {
    let apply = false;
    const cond = rule.condition || {};

    switch (rule.rule_type) {
      case 'time_based':
        const hour = new Date().getHours();
        const start = cond.startHour || 0;
        const end = cond.endHour || 24;
        if (hour >= start && hour < end) apply = true;
        break;
      case 'stock_based':
        if (product.stock <= (cond.maxStock || 5)) apply = true;
        break;
      case 'weekend':
        const day = new Date().getDay();
        if (day === 0 || day === 6) apply = true;
        break;
      case 'demand_based':
        // demand based on recent orders count (simplified)
        const recentOrders = await query(
          "SELECT COUNT(*) FROM order_items WHERE product_id = $1 AND created_at > NOW() - INTERVAL '24 hours'",
          [product.id]
        );
        const count = parseInt(recentOrders.rows[0].count);
        if (count >= (cond.minOrders || 10)) apply = true;
        break;
      default:
        break;
    }

    if (apply) {
      if (rule.adjustment_type === 'percent') {
        finalPrice += (basePrice * rule.adjustment_value) / 100;
      } else {
        finalPrice += rule.adjustment_value;
      }
    }
  }
  return Math.max(finalPrice, 0); // price can't be negative
}
