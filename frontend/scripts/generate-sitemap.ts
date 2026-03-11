/**
 * Sitemap generator for ClearRecap.
 * Run: npx tsx scripts/generate-sitemap.ts
 *
 * Generates public/sitemap.xml with hreflang annotations
 * for all public pages (fr-FR, fr-BE, fr-CH, fr-CA).
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://clearrecap.com';
const LOCALES = ['fr', 'fr-FR', 'fr-BE', 'fr-CH', 'fr-CA'];
const TODAY = new Date().toISOString().split('T')[0];

interface PageEntry {
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

const PAGES: PageEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/oneshot', changefreq: 'monthly', priority: '0.9' },
  { path: '/plans', changefreq: 'monthly', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  // Phase 2 pages (uncomment when created):
  // { path: '/transcription-medicale', changefreq: 'monthly', priority: '0.9' },
  // { path: '/transcription-juridique', changefreq: 'monthly', priority: '0.9' },
  // { path: '/transcription-reunion', changefreq: 'monthly', priority: '0.9' },
  // { path: '/transcription-education', changefreq: 'monthly', priority: '0.9' },
  // { path: '/faq', changefreq: 'monthly', priority: '0.8' },
  // { path: '/comparatif/clearrecap-vs-happyscribe', changefreq: 'monthly', priority: '0.7' },
  // { path: '/comparatif/clearrecap-vs-otter-ai', changefreq: 'monthly', priority: '0.7' },
  // { path: '/comparatif/transcription-cloud-vs-locale', changefreq: 'monthly', priority: '0.7' },
];

function generateHreflangLinks(path: string): string {
  const links = LOCALES.map(
    (locale) =>
      `    <xhtml:link rel="alternate" hreflang="${locale}" href="${BASE_URL}/${locale.toLowerCase()}${path === '/' ? '/' : path}" />`
  );
  links.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />`
  );
  return links.join('\n');
}

function generateSitemap(): string {
  const urls = PAGES.map(
    (page) => `
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${page.lastmod || TODAY}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${generateHreflangLinks(page.path)}
  </url>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

const outputPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
writeFileSync(outputPath, generateSitemap(), 'utf-8');
console.log(`Sitemap generated: ${outputPath}`);
