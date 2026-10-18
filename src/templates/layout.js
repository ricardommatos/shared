import { esc } from './escape.js';

export const url = (config, p = '') => `${config.basePath}${p}`;
export const absUrl = (config, p = '') => `${config.siteUrl}/${p}`;

export function layout({ config, path, title, description, ogPath, ogType = 'website', body }) {
  const fullTitle = path === '' ? config.title : `${title} — ${config.title}`;
  const meta = [
    ['name', 'description', description],
    ['property', 'og:type', ogType],
    ['property', 'og:site_name', config.title],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', absUrl(config, path)],
    ['property', 'og:image', absUrl(config, ogPath)],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:locale', 'pt_PT'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', absUrl(config, ogPath)],
  ];
  if (!config.indexable) meta.push(['name', 'robots', 'noindex']);
  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
${meta.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${esc(value)}">`).join('\n')}
<link rel="canonical" href="${esc(absUrl(config, path))}">
<link rel="icon" href="${url(config, 'assets/icon.svg')}" type="image/svg+xml">
<link rel="preload" href="${url(config, 'assets/fonts/inter-latin-400-normal.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${url(config, 'assets/site.css')}">
<script src="${url(config, 'assets/site.js')}" defer></script>
</head>
<body>
${body}
</body>
</html>
`;
}
