-- ============================================
-- THAESU ONLINE - Enterprise Grade Schema
-- PostgreSQL 16 / UUID / JSONB / GIN Indexes
-- ============================================

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin')),
    is_verified BOOLEAN DEFAULT false,
    is_18_plus BOOLEAN DEFAULT false,
    kpay_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. VENDORS TABLE
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    store_slug VARCHAR(255) UNIQUE NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUCTS TABLE
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    compare_at_price DECIMAL(12,2),
    stock INT DEFAULT 0,
    is_18_plus BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    category VARCHAR(255),
    tags TEXT[],
    attributes JSONB DEFAULT '{}',
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- GIN Index for full-text search (100k+ products performance)
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_vendor ON products(vendor_id);

-- 4. MEDIA TABLE (Cloudinary Rotation Ready)
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    cloudinary_url VARCHAR(500) NOT NULL,
    cloudinary_account VARCHAR(100) NOT NULL,
    media_type VARCHAR(50) DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    sort_order INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CONFIGURATION TABLE (Admin Panel Toggle)
CREATE TABLE config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default Configurations
INSERT INTO config (key, value, description) VALUES
('scraping_engine', '{"enabled": false, "proxy_rotation": true, "scraper_api_key": ""}', 'Scraping Engine Settings'),
('media_rotation', '{"enabled": true, "accounts": [], "current_index": 0}', 'Cloudinary Round-Robin Settings'),
('time_gate', '{"enabled": true, "restricted_hour": 20}', '18+ Content Time Gate'),
('verification', '{"kpay_enabled": true, "amount": 1000}', 'Password Reset Verification');

-- 6. SESSIONS TABLE (For Redis Fallback)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. AUDIT LOGS (Enterprise Security)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);
