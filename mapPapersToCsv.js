#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = {
    input: 'researchOutput.JSON',
    output: 'paper.csv',
    typesOut: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];

    if (current === '--input' && argv[i + 1]) {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }

    if (current === '--output' && argv[i + 1]) {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }

    if (current === '--types-out' && argv[i + 1]) {
      args.typesOut = argv[i + 1];
      i += 1;
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

function toCsv(rows) {
  return `${rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n')}\n`;
}

function readSubtitle(item) {
  return item?.subTitle?.value ?? '';
}

function readAbstract(item) {
  const abstract = item?.abstract;

  if (!abstract) {
    return '';
  }

  if (typeof abstract === 'string') {
    return abstract;
  }

  if (typeof abstract === 'object') {
    return abstract.en_GB ?? abstract.da_DK ?? Object.values(abstract)[0] ?? '';
  }

  return '';
}

function readType(item) {
  return item?.type?.term?.en_GB ?? '';
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node mapPapersToCsv.js [--input researchOutput.JSON] [--output paper.csv] [--types-out paper_types.csv]');
    process.exit(0);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = path.resolve(process.cwd(), args.output);

  const content = await fs.readFile(inputPath, 'utf8');
  const json = JSON.parse(content);
  const items = Array.isArray(json?.items) ? json.items : [];

  const rows = [
    ['uuid', 'year', 'title', 'subtitle', 'university', 'type', 'abstract', 'file', 'totalNumberOfContributors'],
  ];

  const uniqueTypes = new Set();

  for (const item of items) {
    const type = readType(item);
    if (type) {
      uniqueTypes.add(type);
    }

    rows.push([
      item?.uuid ?? '',
      item?.submissionYear ?? '',
      item?.title?.value ?? '',
      readSubtitle(item),
      'ITU',
      type,
      readAbstract(item),
      item?.portalUrl ?? '',
      item?.totalNumberOfContributors ?? '',
    ]);
  }

  await fs.writeFile(outputPath, toCsv(rows), 'utf8');

  if (args.typesOut) {
    const typeRows = [['type'], ...Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b)).map((t) => [t])];
    const typesPath = path.resolve(process.cwd(), args.typesOut);
    await fs.writeFile(typesPath, toCsv(typeRows), 'utf8');
    console.log(`Created ${args.typesOut} with ${typeRows.length - 1} unique types.`);
  }

  console.log(`Created ${args.output} with ${rows.length - 1} rows.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
