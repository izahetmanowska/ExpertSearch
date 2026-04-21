#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

type Args = {
  input: string;
  persons: string;
  output: string;
  help?: boolean;
};

type Contributor = {
  typeDiscriminator?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
  role?: {
    term?: {
      en_GB?: string;
    };
  };
};

type ResearchItem = {
  uuid?: string;
  contributors?: Contributor[];
};

type ResearchOutput = {
  items?: ResearchItem[];
};

type PersonCsvRow = {
  UUID?: string;
  uuid?: string;
  firstName?: string;
  lastName?: string;
};

type PersonLookups = {
  exactNameLookup: Map<string, string>;
  fullNameLookup: Map<string, string>;
  initialLastLookup: Map<string, string>;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    input: 'researchOutput.JSON',
    persons: 'CsvForDB/person.csv',
    output: 'paper_contributors.csv',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--input' && argv[index + 1]) {
      args.input = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--persons' && argv[index + 1]) {
      args.persons = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--output' && argv[index + 1]) {
      args.output = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--help' || current === '-h') {
      args.help = true;
    }
  }

  return args;
}

function normalizeText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeFoldedText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function makeNameKey(firstName: unknown, lastName: unknown): string {
  return `${normalizeText(firstName)}|||${normalizeText(lastName)}`;
}

function makeFoldedFullNameKey(firstName: unknown, lastName: unknown): string {
  return normalizeFoldedText(`${firstName ?? ''} ${lastName ?? ''}`);
}

function makeInitialLastKey(firstName: unknown, lastName: unknown): string {
  const normalizedFirstName = normalizeFoldedText(firstName);
  const normalizedLastName = normalizeFoldedText(lastName);

  if (!normalizedFirstName || !normalizedLastName) {
    return '';
  }

  const firstToken = normalizedFirstName.split(' ').find((token) => token.length > 0) ?? '';
  const initial = firstToken.slice(0, 1);

  if (!initial) {
    return '';
  }

  return `${initial}|||${normalizedLastName}`;
}

function csvEscape(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value);

  if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows: Array<Array<unknown>>): string {
  return `${rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n')}\n`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
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
}

function parseSimpleCsv(content: string): Array<Record<string, string>> {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  lines.slice(1).forEach((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });

    rows.push(row);
  });

  return rows;
}

function buildPersonLookups(personRows: PersonCsvRow[]): PersonLookups {
  const exactNameLookup = new Map<string, string>();
  const exactAmbiguous = new Set<string>();

  const fullNameLookup = new Map<string, string>();
  const fullNameAmbiguous = new Set<string>();

  const initialLastLookup = new Map<string, string>();
  const initialLastAmbiguous = new Set<string>();

  personRows.forEach((row) => {
    const firstName = row.firstName ?? '';
    const lastName = row.lastName ?? '';
    const personUUID = (row.UUID ?? row.uuid ?? '').trim();

    if (!personUUID) {
      return;
    }

    const exactKey = makeNameKey(firstName, lastName);
    const fullNameKey = makeFoldedFullNameKey(firstName, lastName);
    const initialLastKey = makeInitialLastKey(firstName, lastName);

    if (exactKey === '|||' && fullNameKey === '') {
      return;
    }

    if (exactKey !== '|||') {
      const existingExact = exactNameLookup.get(exactKey);

      if (existingExact && existingExact !== personUUID) {
        exactAmbiguous.add(exactKey);
      } else {
        exactNameLookup.set(exactKey, personUUID);
      }
    }

    if (fullNameKey !== '') {
      const existingFullName = fullNameLookup.get(fullNameKey);

      if (existingFullName && existingFullName !== personUUID) {
        fullNameAmbiguous.add(fullNameKey);
      } else {
        fullNameLookup.set(fullNameKey, personUUID);
      }
    }

    if (initialLastKey !== '') {
      const existingInitialLast = initialLastLookup.get(initialLastKey);

      if (existingInitialLast && existingInitialLast !== personUUID) {
        initialLastAmbiguous.add(initialLastKey);
      } else {
        initialLastLookup.set(initialLastKey, personUUID);
      }
    }
  });

  exactAmbiguous.forEach((key) => {
    exactNameLookup.delete(key);
  });

  fullNameAmbiguous.forEach((key) => {
    fullNameLookup.delete(key);
  });

  initialLastAmbiguous.forEach((key) => {
    initialLastLookup.delete(key);
  });

  return {
    exactNameLookup,
    fullNameLookup,
    initialLastLookup,
  };
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node Scripts4DataGathering/dist/mapPaperContributorsToCsv.js [--input researchOutput.JSON] [--persons CsvForDB/person.csv] [--output paper_contributors.csv]');
    process.exit(0);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const personsPath = path.resolve(process.cwd(), args.persons);
  const outputPath = path.resolve(process.cwd(), args.output);

  const [researchContent, personCsvContent] = await Promise.all([
    readFile(inputPath, 'utf8'),
    readFile(personsPath, 'utf8'),
  ]);

  const researchData = JSON.parse(researchContent) as ResearchOutput;
  const personRows = parseSimpleCsv(personCsvContent) as PersonCsvRow[];
  const { exactNameLookup, fullNameLookup, initialLastLookup } = buildPersonLookups(personRows);

  const rows: Array<Array<unknown>> = [
    ['paperUUID', 'personUUID', 'personName', 'personLastname', 'externalContributor', 'role'],
  ];

  const items = Array.isArray(researchData.items) ? researchData.items : [];

  let matchedInternal = 0;
  let unmatchedInternal = 0;
  let matchedSecondPass = 0;
  let matchedThirdPass = 0;

  items.forEach((item) => {
    const paperUUID = item.uuid ?? '';
    const contributors = Array.isArray(item.contributors) ? item.contributors : [];

    contributors.forEach((contributor) => {
      const personName = contributor.name?.firstName ?? '';
      const personLastname = contributor.name?.lastName ?? '';
      const externalContributor = contributor.typeDiscriminator === 'ExternalContributorAssociation';
      const role = contributor.role?.term?.en_GB ?? '';

      let personUUID = '';
      if (!externalContributor) {
        const exactKey = makeNameKey(personName, personLastname);
        personUUID = exactNameLookup.get(exactKey) ?? '';

        if (!personUUID) {
          const fullNameKey = makeFoldedFullNameKey(personName, personLastname);
          personUUID = fullNameLookup.get(fullNameKey) ?? '';
          if (personUUID) {
            matchedSecondPass += 1;
          }
        }

        if (!personUUID) {
          const initialLastKey = makeInitialLastKey(personName, personLastname);
          personUUID = initialLastLookup.get(initialLastKey) ?? '';
          if (personUUID) {
            matchedThirdPass += 1;
          }
        }

        if (personUUID) {
          matchedInternal += 1;
        } else {
          unmatchedInternal += 1;
        }
      }

      rows.push([
        paperUUID,
        personUUID,
        personName,
        personLastname,
        externalContributor,
        role,
      ]);
    });
  });

  await writeFile(outputPath, toCsv(rows), 'utf8');

  const outputRows = Math.max(0, rows.length - 1);
  console.log(`Created ${args.output} with ${outputRows} rows.`);
  console.log(`Matched internal contributors with personUUID: ${matchedInternal}`);
  console.log(` - matched by second pass (accent-insensitive, middle-name tolerant): ${matchedSecondPass}`);
  console.log(` - matched by third pass (unique initial + last name): ${matchedThirdPass}`);
  console.log(`Unmatched internal contributors: ${unmatchedInternal}`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
