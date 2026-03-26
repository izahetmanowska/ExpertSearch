#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = {
    input: 'projects.JSON',
    output: 'project.csv',
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

function readTitle(item) {
  return item?.title?.en_GB ?? '';
}

function readDescription(item) {
  const descriptions = Array.isArray(item?.descriptions) ? item.descriptions : [];

  for (const entry of descriptions) {
    const en = entry?.value?.en_GB;
    if (en) {
      return en;
    }
  }

  for (const entry of descriptions) {
    const da = entry?.value?.da_DK;
    if (da) {
      return da;
    }
  }

  for (const entry of descriptions) {
    const value = entry?.value;
    if (typeof value === 'string' && value) {
      return value;
    }
    if (value && typeof value === 'object') {
      const first = Object.values(value)[0];
      if (first) {
        return first;
      }
    }
  }

  return '';
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node mapProjectsToCsv.js [--input projects.JSON] [--output project.csv]');
    process.exit(0);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = path.resolve(process.cwd(), args.output);

  const content = await fs.readFile(inputPath, 'utf8');
  const json = JSON.parse(content);
  const items = Array.isArray(json?.items) ? json.items : [];

  const rows = [
    ['uuid','title', 'periodStartDate', 'periodEndDate',  'description', 'portalUrl'],
  ];

  for (const item of items) {
    rows.push([
      item?.uuid ?? '',
      readTitle(item),
      item?.period?.startDate ?? '',
      item?.period?.endDate ?? '',
      readDescription(item),
      item?.portalUrl ?? '',
    ]);
  }

  await fs.writeFile(outputPath, toCsv(rows), 'utf8');
  console.log(`Created ${args.output} with ${rows.length - 1} rows.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
