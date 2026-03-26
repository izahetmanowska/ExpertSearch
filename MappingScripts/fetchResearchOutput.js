#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = {
    http: 'getResearchOutput.http',
    out: 'researchOutput.JSON',
    strict: false,
    dedupe: false,
    dedupeKey: 'uuid',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--http' && argv[index + 1]) {
      args.http = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--out' && argv[index + 1]) {
      args.out = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--strict') {
      args.strict = true;
      continue;
    }
    if (current === '--dedupe') {
      args.dedupe = true;
      continue;
    }
    if (current === '--dedupe-key' && argv[index + 1]) {
      args.dedupe = true;
      args.dedupeKey = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--help' || current === '-h') {
      args.help = true;
    }
  }

  return args;
}

function substituteVariables(input, variables) {
  return input.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (_, variableName) => {
    if (variables[variableName] === undefined) {
      throw new Error(`Missing variable: {{${variableName}}}`);
    }
    return variables[variableName];
  });
}

function parseHttpFile(content) {
  const lines = content.split(/\r?\n/);
  const variables = {};

  for (const line of lines) {
    const match = line.match(/^\s*@([a-zA-Z0-9_\-]+)\s*=\s*(.+?)\s*$/);
    if (match) {
      variables[match[1]] = match[2];
    }
  }

  const blocks = content
    .split(/^###\s*$/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/m.test(block));

  const requests = blocks.map((block, blockIndex) => {
    const blockLines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('@'));

    const requestLine = blockLines.find((line) => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\S+/i.test(line));
    if (!requestLine) {
      throw new Error(`Invalid request block at index ${blockIndex}: missing request line`);
    }

    const requestMatch = requestLine.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/i);
    if (!requestMatch) {
      throw new Error(`Invalid request line at block index ${blockIndex}: ${requestLine}`);
    }

    const method = requestMatch[1].toUpperCase();
    const url = substituteVariables(requestMatch[2], variables);

    const headers = {};
    let startHeaders = false;
    for (const line of blockLines) {
      if (!startHeaders && line === requestLine) {
        startHeaders = true;
        continue;
      }
      if (!startHeaders) {
        continue;
      }
      const separatorIndex = line.indexOf(':');
      if (separatorIndex > 0) {
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        headers[key] = substituteVariables(value, variables);
      }
    }

    return { method, url, headers };
  });

  return { variables, requests };
}

async function loadOutputFile(outputPath) {
  try {
    const rawContent = await fs.readFile(outputPath, 'utf8');
    if (!rawContent.trim()) {
      return { items: [] };
    }

    const parsed = JSON.parse(rawContent);
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { items: [] };
    }
    throw error;
  }
}

async function saveOutputFile(outputPath, data) {
  const toWrite = {
    ...data,
    count: Array.isArray(data.items) ? data.items.length : 0,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(outputPath, `${JSON.stringify(toWrite, null, 2)}\n`, 'utf8');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log('Usage: node fetchResearchOutput.js [--http getResearchOutput.http] [--out researchOutput.JSON] [--strict] [--dedupe] [--dedupe-key uuid]');
    process.exit(0);
  }

  const httpPath = path.resolve(process.cwd(), args.http);
  const outputPath = path.resolve(process.cwd(), args.out);

  const httpContent = await fs.readFile(httpPath, 'utf8');
  const { requests } = parseHttpFile(httpContent);

  if (requests.length === 0) {
    throw new Error(`No HTTP requests found in ${args.http}`);
  }

  const outputJson = await loadOutputFile(outputPath);
  if (!Array.isArray(outputJson.items)) {
    outputJson.items = [];
  }

  const knownKeys = new Set();
  if (args.dedupe) {
    for (const item of outputJson.items) {
      const keyValue = item?.[args.dedupeKey];
      if (keyValue !== undefined && keyValue !== null) {
        knownKeys.add(String(keyValue));
      }
    }
  }

  let appended = 0;
  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index];
    console.log(`Request ${index + 1}/${requests.length}: ${request.method} ${request.url}`);

    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
    });

    if (!response.ok) {
      const body = await response.text();
      const message = `Request failed (${response.status} ${response.statusText}): ${request.url}\n${body}`;
      if (args.strict) {
        throw new Error(message);
      }
      console.warn(message);
      continue;
    }

    const responseJson = await response.json();
    if (!Array.isArray(responseJson.items)) {
      const message = `Response from ${request.url} does not have an items array`;
      if (args.strict) {
        throw new Error(message);
      }
      console.warn(message);
      continue;
    }

    let itemsToAppend = responseJson.items;
    if (args.dedupe) {
      itemsToAppend = responseJson.items.filter((item) => {
        const keyValue = item?.[args.dedupeKey];
        if (keyValue === undefined || keyValue === null) {
          return true;
        }
        const normalized = String(keyValue);
        if (knownKeys.has(normalized)) {
          return false;
        }
        knownKeys.add(normalized);
        return true;
      });
    }

    outputJson.items.push(...itemsToAppend);
    appended += itemsToAppend.length;

    if (outputJson.pageInformation === undefined && responseJson.pageInformation !== undefined) {
      outputJson.pageInformation = responseJson.pageInformation;
    }

    await saveOutputFile(outputPath, outputJson);
    if (args.dedupe) {
      const skipped = responseJson.items.length - itemsToAppend.length;
      console.log(`  Appended ${itemsToAppend.length} items, skipped ${skipped} duplicates (total ${outputJson.items.length}).`);
    } else {
      console.log(`  Appended ${responseJson.items.length} items (total ${outputJson.items.length}).`);
    }
  }

  console.log(`Done. Appended ${appended} items into ${args.out}.`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
