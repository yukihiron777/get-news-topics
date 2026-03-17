import axios from 'axios';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { getJSTTimestamp } from '../src/utils';
import { getSource } from '../src/sources-registry';

const SOURCE_ID = 'nikkei';
const config = getSource(SOURCE_ID);

interface ArticleStatusRecord {
  slug: string;
  sourceFile: string;
  articleIndex: number;
  status: 'pending' | 'drafted' | 'queued' | 'dispatched' | 'confirmed' | 'completed';
  contentPath: string;
  draftedAt?: string;
  queuedAt?: string;
  dispatchedAt?: string;
  dispatchId?: string;
  completedAt?: string;
  notes?: string;
}

type StatusMap = Record<string, ArticleStatusRecord[]>;

const STATUS_PATH = path.join('data', SOURCE_ID, 'article-status.json');
const API_URL = `https://api.github.com/repos/${config.target!.repo}/dispatches`;

function loadDotEnv() {
  const envPath = path.resolve('.env');
  if (!existsSync(envPath)) {
    return;
  }
  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadStatus(): StatusMap {
  return JSON.parse(readFileSync(STATUS_PATH, 'utf-8')) as StatusMap;
}

function saveStatus(data: StatusMap) {
  writeFileSync(STATUS_PATH, JSON.stringify(data, null, 2));
}

function findNextRecord(data: StatusMap, slug?: string) {
  const dateKeys = Object.keys(data).sort();
  for (const dateKey of dateKeys) {
    const records = data[dateKey];
    for (let idx = 0; idx < records.length; idx++) {
      const record = records[idx];
      if (slug && record.slug !== slug) {
        continue;
      }
      if (record.status === 'drafted' || record.status === 'queued') {
        return { dateKey, record, index: idx } as const;
      }
    }
  }
  return null;
}

async function main() {
  loadDotEnv();
  const slugArg = process.argv[2];
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN (or GH_TOKEN) is not set. Cannot dispatch article.');
    process.exit(1);
  }

  const statusData = loadStatus();
  const nextRecord = findNextRecord(statusData, slugArg);
  if (!nextRecord) {
    console.error('No drafted or queued articles found for dispatch.');
    process.exit(1);
  }

  const { dateKey, record, index } = nextRecord;
  const content = readFileSync(record.contentPath, 'utf-8');
  if (!content) {
    console.error(`Content file not found: ${record.contentPath}`);
    process.exit(1);
  }

  const body = {
    event_type: 'create-article',
    client_payload: {
      slug: record.slug,
      content,
    },
  };

  record.status = 'queued';
  record.queuedAt = getJSTTimestamp();
  statusData[dateKey][index] = record;
  saveStatus(statusData);

  try {
    const response = await axios.post(API_URL, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'get-news-topics-bot',
      },
    });

    if (response.status !== 204) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }

    record.status = 'dispatched';
    record.dispatchedAt = getJSTTimestamp();
    record.dispatchId = `${record.slug}-${record.dispatchedAt}`;
    statusData[dateKey][index] = record;
    saveStatus(statusData);
    console.log(`Dispatched article slug=${record.slug}`);
  } catch (error) {
    console.error('Failed to dispatch article:', error);
    process.exit(1);
  }
}

main();
