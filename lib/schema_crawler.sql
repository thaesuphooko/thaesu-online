-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crawl Jobs
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    start_url TEXT NOT NULL,
    domain VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','running','paused','completed','stopped','failed')),
    config JSONB DEFAULT '{}'::jsonb,
    strategy VARCHAR(50) DEFAULT 'breadth_first',
    priority INT DEFAULT 0,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_heartbeat TIMESTAMPTZ
);

-- URL Queue with Priority and Partitioning
CREATE TABLE IF NOT EXISTS crawl_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    url_hash TEXT GENERATED ALWAYS AS (encode(sha256(url::bytea), 'hex')) STORED,
    type VARCHAR(50) DEFAULT 'page' CHECK (type IN ('product','category','page')),
    depth INT DEFAULT 0,
    parent_url TEXT,
    priority INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed','skipped')),
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    -- Prevent duplicate URLs per job
    UNIQUE(job_id, url)
);

-- Crawl Logs with Structured Metadata
CREATE TABLE IF NOT EXISTS crawl_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('debug','info','warn','error','critical')),
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Trail for Crawl Operations
CREATE TABLE IF NOT EXISTS crawl_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID,
    action VARCHAR(50),
    performed_by VARCHAR(255),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Materialized View for Crawl Statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS crawl_stats AS
SELECT
    job_id,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE status = 'processing') AS processing,
    COUNT(*) FILTER (WHERE status = 'done') AS done,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
    COUNT(*) AS total
FROM crawl_queue
GROUP BY job_id;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crawl_queue_job_id ON crawl_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_status ON crawl_queue(status);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_priority ON crawl_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_job_id ON crawl_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_created_at ON crawl_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);

-- Unique index for URL deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_queue_url_hash ON crawl_queue(job_id, url_hash);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crawl_jobs_updated_at
    BEFORE UPDATE ON crawl_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Refresh materialized view periodically (can be called from cron)
CREATE OR REPLACE FUNCTION refresh_crawl_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY crawl_stats;
END;
$$ LANGUAGE plpgsql;
