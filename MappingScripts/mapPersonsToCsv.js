#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = {
    input: '../PureJSONs/persons.JSON',
    output: '../CsvForDB/person.csv',
    jobTitles: '../PureJSONs/jobTitles.JSON',
    jobTitleLookupOut: '../CsvForDB/jobTitles.csv',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--input' && argv[index + 1]) {
      args.input = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--output' && argv[index + 1]) {
      args.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--job-titles' && argv[index + 1]) {
      args.jobTitles = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--job-title-lookup-out' && argv[index + 1]) {
      args.jobTitleLookupOut = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--help' || current === '-h') {
      args.help = true;
    }
  }

  return args;
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getFirstAssociation(person) {
  if (!Array.isArray(person?.staffOrganizationAssociations)) {
    return undefined;
  }
  return person.staffOrganizationAssociations[0];
}

function getFirstEmailValue(association) {
  if (!Array.isArray(association?.emails)) {
    return '';
  }
  return association.emails[0]?.value ?? '';
}

async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function createJobTitleIdMap(jobTitlesJson) {
  const map = new Map();
  const classifications = Array.isArray(jobTitlesJson?.classifications)
    ? jobTitlesJson.classifications
    : [];

  let nextId = 1;
  for (const classification of classifications) {
    const title = classification?.term?.en_GB;
    if (!title || map.has(title)) {
      continue;
    }
    map.set(title, nextId);
    nextId += 1;
  }

  return map;
}

function ensureJobTitleId(jobTitleIdMap, title) {
  if (!title) {
    return '';
  }
  if (!jobTitleIdMap.has(title)) {
    jobTitleIdMap.set(title, jobTitleIdMap.size + 1);
  }
  return jobTitleIdMap.get(title);
}

function buildPersonsCsvRows(personsJson, jobTitleIdMap) {
  const rows = [['UUID', 'firstName', 'lastName', 'email', 'jobTitleId']];
  const items = Array.isArray(personsJson?.items) ? personsJson.items : [];

  for (const person of items) {
    const firstAssociation = getFirstAssociation(person);
    const jobTitleEnGb = firstAssociation?.jobTitle?.term?.en_GB ?? '';
    const jobTitleId = ensureJobTitleId(jobTitleIdMap, jobTitleEnGb);

    rows.push([
      person?.uuid ?? '',
      (person?.name?.firstName ?? '').trim(),
      (person?.name?.lastName ?? '').trim(),
      getFirstEmailValue(firstAssociation),
      jobTitleId,
    ]);
  }

  return rows;
}

function buildJobTitleLookupRows(jobTitleIdMap) {
  const rows = [['jobTitleId', 'jobTitle']];
  for (const [jobTitle, jobTitleId] of jobTitleIdMap.entries()) {
    rows.push([jobTitleId, jobTitle]);
  }
  return rows;
}

async function writeCsv(filePath, rows) {
  const csv = rows
    .map((row) => row.map((cell) => csvEscape(cell)).join(','))
    .join('\n');
  await fs.writeFile(filePath, `${csv}\n`, 'utf8');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node mapPersonsToCsv.js [--input persons.JSON] [--output persons_mapped.csv] [--job-titles jobTitles.JSON] [--job-title-lookup-out job_title_lookup.csv]');
    process.exit(0);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = path.resolve(process.cwd(), args.output);
  const jobTitlesPath = path.resolve(process.cwd(), args.jobTitles);
  const jobTitleLookupPath = path.resolve(process.cwd(), args.jobTitleLookupOut);

  const personsJson = await readJsonFile(inputPath);
  const jobTitlesJson = await readJsonFile(jobTitlesPath);

  const jobTitleIdMap = createJobTitleIdMap(jobTitlesJson);
  const personRows = buildPersonsCsvRows(personsJson, jobTitleIdMap);
  const jobTitleLookupRows = buildJobTitleLookupRows(jobTitleIdMap);

  await writeCsv(outputPath, personRows);
  await writeCsv(jobTitleLookupPath, jobTitleLookupRows);

  const personCount = Math.max(0, personRows.length - 1);
  const jobTitleCount = Math.max(0, jobTitleLookupRows.length - 1);
  console.log(`Created ${args.output} with ${personCount} rows.`);
  console.log(`Created ${args.jobTitleLookupOut} with ${jobTitleCount} rows.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
