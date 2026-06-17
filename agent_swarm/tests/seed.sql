-- Enable the extension (pgvector image has this pre-installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store past resolved incidents with their embeddings
CREATE TABLE IF NOT EXISTS incident_embeddings (
    id          SERIAL PRIMARY KEY,
    incident_id VARCHAR(255) NOT NULL,
    alert_name  VARCHAR(255) NOT NULL,
    service     VARCHAR(255) NOT NULL,
    summary     TEXT NOT NULL,
    root_cause  TEXT NOT NULL,
    resolution  TEXT NOT NULL,
    embedding   vector(1536) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Cosine similarity index (faster search at scale)
CREATE INDEX IF NOT EXISTS incident_embeddings_embedding_idx
    ON incident_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10);