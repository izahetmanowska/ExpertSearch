#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

type Args = {
  input: string;
  output: string;
  persons: string;
  delimiter: string;
  inputEncoding: BufferEncoding;
  personsEncoding: BufferEncoding;
  help?: boolean;
};

type Participant = {
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

type ProjectItem = {
  uuid?: string;
  participants?: Participant[];
};

type ProjectsJson = {
  items?: ProjectItem[];
};

type CsvRow = Record<string, string>;

function parseArgs(argv: string[]): Args {
  const args: Args = {
    input: './PureJSONs/projects.JSON',
    output: './project_participants.csv',
    persons: './CsvForDB/person.csv',
    delimiter: ',',
    inputEncoding: 'utf8',
    personsEncoding: 'utf8',
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

    if (current === '--persons' && argv[i + 1]) {
      args.persons = argv[i + 1];
      i += 1;
      continue;
    }

    if (current === '--delimiter' && argv[i + 1]) {
      args.delimiter = argv[i + 1];
      i += 1;
      continue;
    }

    if (current === '--input-encoding' && argv[i + 1]) {
      args.inputEncoding = argv[i + 1] as BufferEncoding;
      i += 1;
      continue;
    }

    if (current === '--persons-encoding' && argv[i + 1]) {
      args.personsEncoding = argv[i + 1] as BufferEncoding;
      i += 1;
      continue;
    }

    if (current === '--help' || current === '-h') {
      args.help = true;
    }
  }

  return args;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function normalize(text: unknown): string {
  if (text === undefined || text === null) return '';
  return String(text).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function csvEscape(value: unknown, delimiter: string): string {
  const text = value === undefined || value === null ? '' : String(value);

  if (
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toCsv(rows: Array<Array<unknown>>, delimiter: string): string {
  return `${rows.map((row) => row.map((cell) => csvEscape(cell, delimiter)).join(delimiter)).join('\n')}\n`;
}

function splitCsvLine(line: string, delimiter: string): string[] {
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

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCsv(content: string): { headers: string[]; rows: CsvRow[] } {
  const normalized = stripBom(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter);

  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });

  return { headers, rows };
}

function buildPersonMap(personRows: CsvRow[], personHeaders: string[]) {
  const personIdColumn = personHeaders.includes('UUID') ? 'UUID' : 'uuid';
  const firstNameColumn = personHeaders.includes('firstName') ? 'firstName' : 'firstname';
  const lastNameColumn = personHeaders.includes('lastName') ? 'lastName' : 'lastname';

  const map = new Map<string, string>();
  const ambiguous = new Set<string>();

  for (const row of personRows) {
    const key = `${normalize(row[firstNameColumn])}|||${normalize(row[lastNameColumn])}`;
    if (key === '|||') continue;

    const uuid = (row[personIdColumn] ?? '').trim();
    if (!uuid) continue;

    if (map.has(key) && map.get(key) !== uuid) {
      ambiguous.add(key);
      continue;
    }

    map.set(key, uuid);
  }

  return { map, ambiguous };
}

function mapRows(data: ProjectsJson, personMap: Map<string, string>, ambiguous: Set<string>): Array<Array<unknown>> {
  const rows: Array<Array<unknown>> = [
    ['projectUUID', 'personName', 'personLastName', 'role', 'externalContributor', 'personUUID'],
  ];

  const projects = Array.isArray(data.items) ? data.items : [];

  for (const project of projects) {
    const participants = Array.isArray(project.participants) ? project.participants : [];

    for (const participant of participants) {
      const firstName = (participant.name?.firstName ?? '').trim();
      const lastName = (participant.name?.lastName ?? '').trim();
      const externalContributor = participant.typeDiscriminator === 'ExternalParticipantAssociation';

      let personUUID = '';
      if (!externalContributor) {
        const key = `${normalize(firstName)}|||${normalize(lastName)}`;
        if (!ambiguous.has(key)) {
          personUUID = personMap.get(key) ?? '';
        }
      }

      rows.push([
        project.uuid ?? '',
        firstName,
        lastName,
        participant.role?.term?.en_GB ?? '',
        externalContributor,
        personUUID,
      ]);
    }
  }

  return rows;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      'Usage: node dist/mapProjectParticipantsToCsv.js ' +
      '[--input projects.JSON] [--persons CsvForDB/person.csv] ' +
      '[--output project_participants.csv] [--delimiter ;] ' +
      '[--input-encoding utf8] [--persons-encoding utf8]'
    );
    process.exit(0);
  }

  const workspaceRoot = process.cwd();
  const inputPath = path.resolve(workspaceRoot, args.input);
  const personsPath = path.resolve(workspaceRoot, args.persons);
  const outputPath = path.resolve(workspaceRoot, args.output);

  const [projectsContent, personsContent] = await Promise.all([
    readFile(inputPath, args.inputEncoding),
    readFile(personsPath, args.personsEncoding),
  ]);

  const parsedProjects = JSON.parse(stripBom(projectsContent)) as ProjectsJson;
  const personsCsv = parseCsv(personsContent);

  const { map: personMap, ambiguous } = buildPersonMap(personsCsv.rows, personsCsv.headers);
  const rows = mapRows(parsedProjects, personMap, ambiguous);

  await writeFile(outputPath, toCsv(rows, args.delimiter), 'utf8');
  console.log(`Created ${args.output} with ${rows.length - 1} rows.`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});