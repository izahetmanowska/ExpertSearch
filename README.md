# Experts Search Engine

We are building a search engine to find experts from ITU which uses a database with data from a wide range of sources: PURE, The Danish Research Portal and LearnIT (from where we retrieve all courses taught by ITU academics).

## 1. Requirements

To run both server and client it is only necessary to have Docker installed.
If you do not have it yet, you can find link here: [Download](https://www.docker.com/products/docker-desktop/)

## 2. Data extraction

We extracted data from:

- Pure: Persons of interest, projects and research output - by querying an API and transforming JSONs into formatted CSVs which we will load to our DB.
- the Danish Research portal: projects and research output from academics before joining ITU - by using a web crawler
- LearnIT: professors and courses taught - by using a web crawler

## 3. Data cleaning

## 4. Database

We have pooled the data from all these different sources under a single DB hosted in PostgresSQL (RDS) and used pgAdmin as a CLI.

## 5. Server (Back-end)

The Back-end API is in `App/server` and uses Python: FastAPI + Uvicorn + Whoosh. Moreover, it has been containerised, so it can be run in Docker with a single command.

### 5.1 Run the server (macOS)

From the project root:

```bash
make server
```

### 5.2 Run the server (Windows)

```bash
cd App/server && docker compose up --build
```

If you are using plain cmd.exe, you should run it as two commands:

`\cd App\server`
`docker compose up --build`

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

```bash
cd App/client && docker compose up --build
```

If you are using plain cmd.exe, you should run it as two commands:

`\cd App\client`
`docker compose up --build`

Client should start at:

- `http://127.0.0.1:3000`

### 5.4 Closing client

Either press the stop button on the corresponding container on the Docker Desktop GUI or press `Ctrl` + `C` on the corresponding terminal.

## 7. Appendix

### PURE data fetch helper

Run all requests from `getResearchOutput.http`, extract each response JSON, and append each response `items` array into `researchOutput.JSON`.

#### Requirements

- Node.js 18+ (uses native `fetch`)

#### Usage

```bash
node fetchResearchOutput.js
```

Optional arguments:

```bash
node fetchResearchOutput.js --http getResearchOutput.http --out researchOutput.JSON --strict
```

- `--http`: path to the `.http` request file
- `--out`: output JSON file path
- `--strict`: stop immediately on first failed request or invalid JSON shape
- `--dedupe`: skip items already present in output (uses `uuid` as default key)
- `--dedupe-key`: choose the field used for deduplication, e.g. `--dedupe-key pureId`

The script writes the output file after every successful API call, so partial progress is preserved if a later call fails.

Example with deduplication:

```bash
node fetchResearchOutput.js --dedupe
```

### Persons JSON to CSV mapper

Map selected fields from `persons.JSON` into a flat CSV for database import.

Mapped output columns:

- `UUID` ← `items[*].uuid`
- `firstName` ← `items[*].name.firstName`
- `lastName` ← `items[*].name.lastName`
- `email` ← `items[*].staffOrganizationAssociations[0].emails[0].value`
- `jobTitleId` ← integer mapped from `items[*].staffOrganizationAssociations[0].jobTitle.term.en_GB`

Run:

```bash
node mapPersonsToCsv.js
```

Optional arguments:

```bash
node mapPersonsToCsv.js --input persons.JSON --output persons_mapped.csv --job-titles jobTitles.JSON --job-title-lookup-out job_title_lookup.csv
```

The script also writes a lookup CSV (`job_title_lookup.csv`) so `jobTitleId` can be used as a foreign key.

### Research output JSON to Paper CSV mapper

Map selected fields from `researchOutput.JSON` into a flat CSV for database import into the `Paper` table.

Mapped output columns:

- `uuid` ← `items[*].uuid`
- `year` ← `items[*].submissionYear`
- `title` ← `items[*].title.value`
- `subtitle` ← `items[*].subTitle.value`
- `university` ← constant `ITU`
- `type` ← `items[*].type.term.en_GB`
- `abstract` ← `items[*].abstract` (prefers `en_GB`, then `da_DK`)
- `file` ← `items[*].portalUrl`
- `totalNumberOfContributors` ← `items[*].totalNumberOfContributors`

Run:

```bash
node mapPapersToCsv.js
```

Optional arguments:

```bash
node mapPapersToCsv.js --input researchOutput.JSON --output paper.csv --types-out paper_types.csv
```

- `--input`: path to source research output JSON
- `--output`: destination CSV for the `Paper` table
- `--types-out`: optional CSV containing all unique values found in `type`

### Projects JSON to Project CSV mapper

Map selected fields from `projects.JSON` into a flat CSV for database import into the `Project` table.

Mapped output columns:

- `uuid` ← `items[*].uuid`
- `title` ← `items[*].title.en_GB`
- `periodStartDate` ← `items[*].period.startDate`
- `periodEndDate` ← `items[*].period.endDate`
- `description` ← first available `items[*].descriptions[*].value.en_GB`
- `portalUrl` ← `items[*].portalUrl`

Run:

```bash
node mapProjectsToCsv.js
```

Optional arguments:

```bash
node mapProjectsToCsv.js --input projects.JSON --output project.csv
```

- `--input`: path to source projects JSON
- `--output`: destination CSV for the `Project` table

### Projects participants JSON to CSV mapper (TypeScript)

Map project participants from `projects.JSON` into a flat CSV. Each participant in `items[*].participants[*]` is saved as one row.

Mapped output columns:

- `projectUUID` ← `items[*].uuid`
- `personName` ← `items[*].participants[*].name.firstName`
- `personLastName` ← `items[*].participants[*].name.lastName`
- `role` ← `items[*].participants[*].role.term.en_GB`
- `externalContributor` ← `true` when `items[*].participants[*].typeDiscriminator === "ExternalParticipantAssociation"`, otherwise `false`

Compile TypeScript:

```bash
npx tsc
```

Run:

```bash
node Scripts4DataGathering/dist/mappingProjectParticipants.js 
```

### Research output contributors to PaperContributors CSV mapper (TypeScript)

Map contributors from `researchOutput.JSON` into a flat CSV for the `PapeContributors` table. Each contributor in `items[*].contributors[*]` is written as one row.

Mapped output columns:

- `paperUUID` ← `items[*].uuid`
- `personUUID` ← matched from `CsvForDB/person.csv` when `externalContributor = false` using 3 passes: exact (`firstName`,`lastName`), accent-insensitive full-name fallback, then unique initial+last-name fallback (e.g., `J. Smith`)
- `personName` ← `items[*].contributors[*].name.firstName`
- `personLastname` ← `items[*].contributors[*].name.lastName`
- `externalContributor` ← `true` when `items[*].contributors[*].typeDiscriminator === "ExternalContributorAssociation"`, otherwise `false`
- `role` ← `items[*].contributors[*].role.term.en_GB`

Compile TypeScript:

```bash
npx tsc
```

Run:

```bash
node Scripts4DataGathering/dist/mapPaperContributorsToCsv.js --input researchOutput.JSON --persons CsvForDB/person.csv --output paper_contributors.csv
```
