-- Crawl jobs
CREATE TABLE IF NOT EXISTS crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    start_url TEXT NOT NULL,
    domain VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','running','paused','completed','stopped')),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Queue for URLs to visit
CREATE TABLE IF NOT EXISTS crawl_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'page' CHECK (type IN ('product','category','page')),
    depth INT DEFAULT 0,
    parent_url TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(job_id, url)
);

-- Crawl activity logs
CREATE TABLE IF NOT EXISTS crawl_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES crawl_jobs(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'info',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
