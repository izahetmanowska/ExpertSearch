import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "expertsearchdb.cfqcguycqydz.eu-north-1.rds.amazonaws.com"),
    "dbname": os.getenv("DB_NAME", "ExpertsDb"),
    "user": os.getenv("DB_USER", "postgresAdmin"),
    "password": os.getenv("DB_PASSWORD", "voknef-kuxziv-detwY0"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "sslmode": os.getenv("DB_SSLMODE", "require"),
}