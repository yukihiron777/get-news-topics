import { readFileSync } from 'fs';
import path from 'path';

export interface SourceConfig {
  id: string;
  label: string;
  url: string;
  baseUrl: string;
  blockedDomains: string[];
  target: { repo: string } | null;
}

interface SiteConfig {
  repo: string;
  domain: string;
  status: string;
}

interface SourcesRegistry {
  sources: SourceConfig[];
  sites: SiteConfig[];
}

let _registry: SourcesRegistry | null = null;

function loadRegistry(): SourcesRegistry {
  if (_registry) return _registry;
  const registryPath = path.join(process.cwd(), 'sources.json');
  _registry = JSON.parse(readFileSync(registryPath, 'utf-8')) as SourcesRegistry;
  return _registry;
}

export function getSource(id: string): SourceConfig {
  const registry = loadRegistry();
  const source = registry.sources.find(s => s.id === id);
  if (!source) {
    throw new Error(`Source "${id}" not found in sources.json. Run: gh api repos/yukihiron777/np-docs/contents/sources.json --jq '.content' | base64 -d > sources.json`);
  }
  return source;
}

export function getAllSources(): SourceConfig[] {
  return loadRegistry().sources;
}

export function getSites(): SiteConfig[] {
  return loadRegistry().sites;
}
