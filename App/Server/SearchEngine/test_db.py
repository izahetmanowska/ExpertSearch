import psycopg

conn = psycopg.connect(
    host="expertsearchdb.cfqcguycqydz.eu-north-1.rds.amazonaws.com/",
    dbname="ExpertsDb",
    user="postgresAdmin",
    password="voknef-kuxziv-detwY0",
    port=5432,
    sslmode="require"
)

with conn.cursor() as cur:
    cur.execute("SELECT version();")
    print(cur.fetchone())