#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = {
    participants: 'project_participants.csv',
    persons: 'CsvForDB/person.csv',
    out: 'project_participants.csv',
    backup: 'project_participants.csv.bak',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--participants' && argv[i + 1]) {
      args.participants = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === '--persons' && argv[i + 1]) {
      args.persons = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === '--backup' && argv[i + 1]) {
      args.backup = argv[i + 1];
      i += 1;
      continue;
    }
    if (current === '--help' || current === '-h') {
      args.help = true;
    }
  }

  return args;
}

function normalize(text) {
  if (text === undefined || text === null) {
    return '';
  }
  return String(text).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function parseCsv(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current);
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });

  return { headers, rows };
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(headers, rows) {
  const lines = [headers.map((header) => csvEscape(header)).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header] ?? '')).join(','));
  });
  return `${lines.join('\n')}\n`;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node Scripts4DataGathering/enrichProjectParticipantsWithPersonUUID.js [--participants project_participants.csv] [--persons CsvForDB/person.csv] [--out project_participants.csv] [--backup project_participants.csv.bak]');
    process.exit(0);
  }

  const participantsPath = path.resolve(process.cwd(), args.participants);
  const personsPath = path.resolve(process.cwd(), args.persons);
  const outPath = path.resolve(process.cwd(), args.out);
  const backupPath = path.resolve(process.cwd(), args.backup);

  const [participantsContent, personsContent] = await Promise.all([
    fs.readFile(participantsPath, 'utf8'),
    fs.readFile(personsPath, 'utf8'),
  ]);

  const { headers: participantHeaders, rows: participantRows } = parseCsv(participantsContent);
  const { headers: personHeaders, rows: personRows } = parseCsv(personsContent);

  const personIdColumn = personHeaders.includes('UUID') ? 'UUID' : 'uuid';
  const firstNameColumn = personHeaders.includes('firstName') ? 'firstName' : 'firstname';
  const lastNameColumn = personHeaders.includes('lastName') ? 'lastName' : 'lastname';

  const personMap = new Map();
  const ambiguous = new Set();

  personRows.forEach((row) => {
    const key = `${normalize(row[firstNameColumn])}|||${normalize(row[lastNameColumn])}`;
    if (key === '|||') {
      return;
    }

    const uuid = (row[personIdColumn] || '').trim();
    if (!uuid) {
      return;
    }

    if (personMap.has(key) && personMap.get(key) !== uuid) {
      ambiguous.add(key);
      return;
    }

    personMap.set(key, uuid);
  });

  const headers = participantHeaders.includes('personUUID')
    ? [...participantHeaders]
    : [...participantHeaders, 'personUUID'];

  let matchedInternal = 0;
  let unmatchedInternal = 0;
  let ambiguousInternal = 0;

  participantRows.forEach((row) => {
    const isExternal = normalize(row.externalContributor) === 'true';

    if (isExternal) {
      row.personUUID = '';
      return;
    }

    const key = `${normalize(row.personName)}|||${normalize(row.personLastName)}`;

    if (ambiguous.has(key)) {
      row.personUUID = '';
      unmatchedInternal += 1;
      ambiguousInternal += 1;
      return;
    }

    const uuid = personMap.get(key) || '';
    row.personUUID = uuid;

    if (uuid) {
      matchedInternal += 1;
    } else {
      unmatchedInternal += 1;
    }
  });

  if (participantsPath === outPath) {
    await fs.copyFile(participantsPath, backupPath);
  }

  await fs.writeFile(outPath, toCsv(headers, participantRows), 'utf8');

  console.log(`Updated ${args.out}`);
  if (participantsPath === outPath) {
    console.log(`Backup saved to ${args.backup}`);
  }
  console.log(`Rows: ${participantRows.length}`);
  console.log(`Matched internal rows: ${matchedInternal}`);
  console.log(`Unmatched internal rows: ${unmatchedInternal}`);
  console.log(` - ambiguous name matches: ${ambiguousInternal}`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
