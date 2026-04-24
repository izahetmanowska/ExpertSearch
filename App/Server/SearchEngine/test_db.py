import psycopg

conn = psycopg.connect(
    host="expertsearchdb.cfqcguycqydz.eu-north-1.rds.amazonaws.com",
    dbname="ExpertsDb",
    user="postgresAdmin",
    password="voknef-kuxziv-detwY0",
    port=5432,
    sslmode="require"
)

with conn.cursor() as cur:
    cur.execute("""
        SELECT uuid, papers
        FROM indexed_experts
        WHERE papers IS NOT NULL
        LIMIT 5
    """)
    rows = cur.fetchall()

for row in rows:
    print(row)