CREATE TABLE IF NOT EXISTS pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('time_based', 'stock_based', 'demand_based', 'weekend')),
    condition JSONB NOT NULL DEFAULT '{}',
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('percent', 'fixed')),
    adjustment_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
