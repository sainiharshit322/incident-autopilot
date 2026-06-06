import os
import psycopg2
from pgvector.psycopg2 import register_vector
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_DIMENSIONS = 1536


def get_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-2-preview",
        google_api_key=os.getenv("GEMINI_API_KEY"),
        output_dimensionality=EMBEDDING_DIMENSIONS,
    )


def get_db_connection():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    register_vector(conn)
    return conn


def embed_text(text: str) -> list[float]:
    model = get_embeddings_model()
    return model.embed_query(text)


def search_similar_incidents(query_embedding: list[float], limit: int = 3) -> list[dict]:
    """
    Cosine similarity search against resolved incidents.
    Returns up to `limit` most similar incidents.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                incident_id,
                alert_name,
                service,
                summary,
                root_cause,
                resolution,
                1 - (embedding <=> %s::vector) AS similarity
            FROM incident_embeddings
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_embedding, query_embedding, limit),
        )
        rows = cur.fetchall()
        return [
            {
                "incident_id": row[0],
                "alert_name":  row[1],
                "service":     row[2],
                "summary":     row[3],
                "root_cause":  row[4],
                "resolution":  row[5],
                "similarity":  round(float(row[6]), 4),
            }
            for row in rows
        ]
    finally:
        cur.close()
        conn.close()


def seed_fake_incidents():
    """
    Seeds 4 resolved incidents with real embeddings into the DB.
    Run this ONCE to populate data for the pattern matcher.
    """
    fake_incidents = [
        {
            "incident_id": "INC-001",
            "alert_name":  "HighErrorRate",
            "service":     "payment-service",
            "summary":     "NullPointerException in PaymentProcessor causing 500 errors",
            "root_cause":  "PaymentProcessor.charge() called on null object due to missing null check after DB lookup",
            "resolution":  "Added null guard in PaymentProcessor.process(). Deployed hotfix v2.3.1. Restarted payment-service pods.",
        },
        {
            "incident_id": "INC-002",
            "alert_name":  "ServiceUnavailable",
            "service":     "auth-service",
            "summary":     "Redis connection exhaustion causing all authentication requests to fail with 503",
            "root_cause":  "Connection pool limit of 10 exceeded due to leaked connections in JwtFilter when Redis is slow",
            "resolution":  "Increased Redis connection pool to 50. Fixed connection leak in JwtFilter finally block. Added circuit breaker.",
        },
        {
            "incident_id": "INC-003",
            "alert_name":  "PodOOMKilled",
            "service":     "api-gateway",
            "summary":     "API gateway pods OOMKilled after memory usage exceeded 512Mi limit",
            "root_cause":  "Memory leak in request logging middleware accumulating large request bodies in memory",
            "resolution":  "Increased memory limit to 1Gi. Fixed logging middleware to stream bodies instead of buffering. Added heap dump alert.",
        },
        {
            "incident_id": "INC-004",
            "alert_name":  "HighLatency",
            "service":     "order-service",
            "summary":     "Order service P99 latency spiked to 8s due to N+1 query pattern on order items",
            "root_cause":  "Missing JOIN in getOrderWithItems() causing one DB query per order item",
            "resolution":  "Rewrote query with LEFT JOIN FETCH. Added query plan logging. Response time back to 120ms P99.",
        },
    ]

    embeddings_model = get_embeddings_model()
    conn = get_db_connection()

    try:
        cur = conn.cursor()
        for incident in fake_incidents:
            # Embed the summary — this is what we search against at query time
            embedding = embeddings_model.embed_query(incident["summary"])
            cur.execute(
                """
                INSERT INTO incident_embeddings
                    (incident_id, alert_name, service, summary, root_cause, resolution, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (
                    incident["incident_id"],
                    incident["alert_name"],
                    incident["service"],
                    incident["summary"],
                    incident["root_cause"],
                    incident["resolution"],
                    embedding,
                ),
            )
        conn.commit()
        print(f"Seeded {len(fake_incidents)} incidents successfully.")
    finally:
        cur.close()
        conn.close()