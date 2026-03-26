#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

type Args = {
  personsInput: string;
  papersInput: string;
  projectsInput: string;
  keywordsOutput: string;
  personKeywordsOutput: string;
  paperKeywordsOutput: string;
  projectKeywordsOutput: string;
  help?: boolean;
};

type KeywordLocaleEntry = {
  locale?: string;
  freeKeywords?: unknown[];
};

type KeywordGroup = {
  keywords?: KeywordLocaleEntry[];
};

type GenericItem = {
  uuid?: string;
  keywordGroups?: KeywordGroup[];
};

type GenericCollection = {
  items?: GenericItem[];
};

type KeywordRecord = {
  keywordId: number;
  normalizedTerm: string;
};

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'hers', 'him', 'his',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'me', 'my', 'mine',
  'of', 'on', 'or', 'our', 'ours', 'ourselves', 'she', 'so', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'to', 'too', 'under', 'until', 'up', 'us', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'who', 'whom', 'why',
  'with', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

function parseArgs(argv: string[]): Args {
  const args: Args = {
    personsInput: 'persons.JSON',
    papersInput: 'researchOutput.JSON',
    projectsInput: 'projects.JSON',
    keywordsOutput: 'Keywords.csv',
    personKeywordsOutput: 'PersonKeywords.csv',
    paperKeywordsOutput: 'PaperKeywords.csv',
    projectKeywordsOutput: 'ProjectKeywords.csv',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--persons-input' && argv[index + 1]) {
      args.personsInput = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--papers-input' && argv[index + 1]) {
      args.papersInput = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--projects-input' && argv[index + 1]) {
      args.projectsInput = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--keywords-output' && argv[index + 1]) {
      args.keywordsOutput = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--person-keywords-output' && argv[index + 1]) {
      args.personKeywordsOutput = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--paper-keywords-output' && argv[index + 1]) {
      args.paperKeywordsOutput = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--project-keywords-output' && argv[index + 1]) {
      args.projectKeywordsOutput = argv[index + 1];
      index += 1;
      continue;
    }

    if (current === '--help' || current === '-h') {
      args.help = true;
    }
  }

  return args;
}

function normalizeTerm(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
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

function extractEnglishFreeKeywords(item: GenericItem): string[] {
  const groups = Array.isArray(item.keywordGroups) ? item.keywordGroups : [];
  const output: string[] = [];

  groups.forEach((group) => {
    const localeEntries = Array.isArray(group.keywords) ? group.keywords : [];

    localeEntries.forEach((entry) => {
      if (entry.locale !== 'en_GB') {
        return;
      }

      const freeKeywords = Array.isArray(entry.freeKeywords) ? entry.freeKeywords : [];

      freeKeywords.forEach((keyword) => {
        if (typeof keyword !== 'string') {
          return;
        }

        output.push(keyword);
      });
    });
  });

  return output;
}

function splitIntoSubterms(normalizedTerm: string): string[] {
  if (!normalizedTerm) {
    return [];
  }

  return normalizedTerm
    .replace(','," ")
    .split(' ')
    .map((subterm) => subterm.trim())
    .map((subterm) => subterm.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((subterm) => subterm.length > 0)
    .filter((subterm) => /[\p{L}\p{N}]/u.test(subterm))
    .filter((subterm) => !STOPWORDS.has(subterm));
}

function processItems(
  items: GenericItem[],
  keywordMap: Map<string, number>,
  keywordsInOrder: KeywordRecord[],
  relationRows: Array<Array<unknown>>,
): void {
  items.forEach((item) => {
    const entityUUID = (item.uuid ?? '').trim();
    if (!entityUUID) {
      return;
    }

    const freeKeywords = extractEnglishFreeKeywords(item);

    freeKeywords.forEach((rawKeyword) => {
      const normalizedTerm = normalizeTerm(rawKeyword);
      if (!normalizedTerm) {
        return;
      }

      const subterms = splitIntoSubterms(normalizedTerm);

      subterms.forEach((subterm) => {
        let keywordId = keywordMap.get(subterm);

        if (keywordId === undefined) {
          keywordId = keywordsInOrder.length;
          keywordMap.set(subterm, keywordId);
          keywordsInOrder.push({
            keywordId,
            normalizedTerm: subterm,
          });
        }

        relationRows.push([entityUUID, keywordId]);
      });
    });
  });
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node MappingScripts/dist/mapKeywordsToCsv.js [--persons-input persons.JSON] [--papers-input researchOutput.JSON] [--projects-input projects.JSON] [--keywords-output Keywords.csv] [--person-keywords-output PersonKeywords.csv] [--paper-keywords-output PaperKeywords.csv] [--project-keywords-output ProjectKeywords.csv]');
    process.exit(0);
  }

  const workspaceRoot = process.cwd();
  const personsPath = path.resolve(workspaceRoot, args.personsInput);
  const papersPath = path.resolve(workspaceRoot, args.papersInput);
  const projectsPath = path.resolve(workspaceRoot, args.projectsInput);

  const [personsRaw, papersRaw, projectsRaw] = await Promise.all([
    readFile(personsPath, 'utf8'),
    readFile(papersPath, 'utf8'),
    readFile(projectsPath, 'utf8'),
  ]);

  const persons = JSON.parse(personsRaw) as GenericCollection;
  const papers = JSON.parse(papersRaw) as GenericCollection;
  const projects = JSON.parse(projectsRaw) as GenericCollection;

  const personItems = Array.isArray(persons.items) ? persons.items : [];
  const paperItems = Array.isArray(papers.items) ? papers.items : [];
  const projectItems = Array.isArray(projects.items) ? projects.items : [];

  const keywordMap = new Map<string, number>();
  const keywordsInOrder: KeywordRecord[] = [];

  const personKeywordRows: Array<Array<unknown>> = [['personUUID', 'keywordId']];
  const paperKeywordRows: Array<Array<unknown>> = [['paperUUID', 'keywordId']];
  const projectKeywordRows: Array<Array<unknown>> = [['projectUUID', 'keywordId']];

  processItems(personItems, keywordMap, keywordsInOrder, personKeywordRows);
  processItems(paperItems, keywordMap, keywordsInOrder, paperKeywordRows);
  processItems(projectItems, keywordMap, keywordsInOrder, projectKeywordRows);

  const keywordsRows: Array<Array<unknown>> = [['keywordId', 'normalized_term']];
  keywordsInOrder.forEach((record) => {
    keywordsRows.push([record.keywordId, record.normalizedTerm]);
  });

  const keywordsOutputPath = path.resolve(workspaceRoot, args.keywordsOutput);
  const personKeywordsOutputPath = path.resolve(workspaceRoot, args.personKeywordsOutput);
  const paperKeywordsOutputPath = path.resolve(workspaceRoot, args.paperKeywordsOutput);
  const projectKeywordsOutputPath = path.resolve(workspaceRoot, args.projectKeywordsOutput);

  await Promise.all([
    writeFile(keywordsOutputPath, toCsv(keywordsRows), 'utf8'),
    writeFile(personKeywordsOutputPath, toCsv(personKeywordRows), 'utf8'),
    writeFile(paperKeywordsOutputPath, toCsv(paperKeywordRows), 'utf8'),
    writeFile(projectKeywordsOutputPath, toCsv(projectKeywordRows), 'utf8'),
  ]);

  console.log(`Created ${args.keywordsOutput} with ${keywordsRows.length - 1} rows.`);
  console.log(`Created ${args.personKeywordsOutput} with ${personKeywordRows.length - 1} rows.`);
  console.log(`Created ${args.paperKeywordsOutput} with ${paperKeywordRows.length - 1} rows.`);
  console.log(`Created ${args.projectKeywordsOutput} with ${projectKeywordRows.length - 1} rows.`);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
