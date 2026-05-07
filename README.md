# Experts Search Engine

We are building a search engine to find experts from ITU which uses a database with data from a wide range of sources: PURE, The Danish Research Portal and LearnIT (from where we retrieve all courses taught by ITU academics).

## 1. Requirements

To run both server and client it is only necessary to have Docker installed.
If you do not have it yet, you can find link here: [Download](https://www.docker.com/products/docker-desktop/)

## 2. Data extraction and mapping

We extracted data from:

- Pure: Persons of interest, projects and research output - by querying an API and transforming JSONs (which can be found in original format in `./Data_collection/PureJSONs`) into formatted CSVs (the mapping scripts can be found in `./Data_collection/MappingScripts` and the result `./Data_collection/CsvForDB`) which we loaded to our DB.
- the Danish Research portal: research output from academics before joining ITU (saved in `./Data_collection/CsvForDB`) - by using a web crawler (scripts can be found `./Data_collection/danish_research_portal_scraper`).
- LearnIT: professors and courses taught - by using a web crawler (scripts can be found `./Data_collection/danish_research_portal_scraper` and formatted output can be found in `./Data_collection/CsvForDB`)

## 3. Data cleaning

Some of the data extracted from these various sources was not useful, therefore we had to:

1. Run scripts on it to remove some undesired values.
2. Load it on to staging tables on the DB for further cleaning and filtering before passing the relevant data
on to the final tables.

## 4. Database

We have pooled the data from all these different sources under a single DB hosted in AWS RDS (PostgresSQL) and used pgAdmin as a CLI.

## 5. Server (Back-end)

The Back-end API is in `App/server` and uses Python: FastAPI + Uvicorn + Whoosh. Moreover, it has been containerised, so it can be run in Docker with a single command.

### 5.1 Run the server (macOS)

From the project root:

```bash
make server
```

### 5.2 Run the server (Windows)

You should run it as two commands:

```powershell
cd App/server 
docker compose up --build
```

Server should start at:

- `http://127.0.0.1:8000`

### 5.3 Server documentation

- Swagger docs: `http://127.0.0.1:8000/docs`

### 5.4 Closing server

Either press the stop button on the corresponding container on the Docker Desktop GUI or press `Ctrl` + `C` on the corresponding terminal.

### 5.5 Optional environment variables (DB connection)

Defaults from `dbconfig.py` are used.

## 6. Client

The Front-end is developed using Node.js, Typescript and React. Just like the Back-end, it has been containerised, so it can be run in Docker with a single command.

### 5.1 Run the client (macOS)

From the project root:

```bash
make client
```

### 5.2 Run the client (Windows)

You should run it as two commands:

```powershell
\cd App\client
docker compose up --build
```

Client should start at:

- `http://127.0.0.1:3000`

Access the URL above from any browser to use the search engine.

### 5.3 Closing client

Either press the stop button on the corresponding container on the Docker Desktop GUI or press `Ctrl` + `C` on the corresponding terminal.
