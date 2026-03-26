#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

type Args = {
  input: string;
  output: string;
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

function parseArgs(argv: string[]): Args {
  const args: Args = {
    input: 'projects.JSON',
    output: 'project_participants.csv',
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

    if (current === '--help' || current === '-h') {
      args.help = true;
    }
  }

  return args;
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

function mapRows(data: ProjectsJson): Array<Array<unknown>> {
  const rows: Array<Array<unknown>> = [
    ['projectUUID', 'personName', 'personLastName', 'role', 'externalContributor'],
  ];

  const projects = Array.isArray(data.items) ? data.items : [];

  projects.forEach((project) => {
    const participants = Array.isArray(project.participants) ? project.participants : [];

    participants.forEach((participant) => {
      const externalContributor = participant.typeDiscriminator === 'ExternalParticipantAssociation';

      rows.push([
        project.uuid ?? '',
        participant.name?.firstName ?? '',
        participant.name?.lastName ?? '',
        participant.role?.term?.en_GB ?? '',
        externalContributor,
      ]);
    });
  });

  return rows;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node Scripts4DataGathering/dist/mapProjectParticipantsToCsv.js [--input projects.JSON] [--output project_participants.csv]');
    process.exit(0);
  }

  const workspaceRoot = process.cwd();
  const inputPath = path.resolve(workspaceRoot, args.input);
  const outputPath = path.resolve(workspaceRoot, args.output);

  const content = await readFile(inputPath, 'utf8');
  const parsed = JSON.parse(content) as ProjectsJson;

  const rows = mapRows(parsed);

  await writeFile(outputPath, toCsv(rows), 'utf8');
  console.log(`Created ${args.output} with ${rows.length - 1} rows.`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
