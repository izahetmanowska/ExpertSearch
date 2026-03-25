# Experts Search Engine

We are building a search engine to find experts from ITU which uses a database with data from a wider range of sources, and would
provide better results to anyone querying it.

## Step 1: Extracting data

We extracted data from:

- Pure: Persons of interest, projects and research output - through an API
- the Danish Research portal: projects and research output from academics before joining ITU - by using a web crawler
- LearnIT: professors and courses taught - by using a web crawler

## Step 2: Creating a basic database

We have pooled the data from all these different sources under a single DB hosted in PostgresSQL and used DBeaver as a CLI.


## Appendix

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
