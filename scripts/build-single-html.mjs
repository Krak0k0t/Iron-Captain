import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const distHtmlPath = path.join(distDir, 'index.html');
const outRootHtmlPath = path.resolve(process.cwd(), 'Iron_Captain.html');

if (!fs.existsSync(distHtmlPath)) {
  console.error('dist/index.html not found. Run npm run build first.');
  process.exit(1);
}

let html = fs.readFileSync(distHtmlPath, 'utf8');

// Inline CSS links
html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g, (match, href) => {
  if (href.startsWith('http')) return match;
  const rel = href.replace(/^\//, '');
  const cssPath = path.join(distDir, rel);
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    return `<style>\n${css}\n</style>`;
  }
  return match;
});

// Inline module scripts
html = html.replace(/<script[^>]+type="module"[^>]+src="([^"]+)"[^>]*><\/script>/g, (match, src) => {
  if (src.startsWith('http')) return match;
  const rel = src.replace(/^\//, '');
  const jsPath = path.join(distDir, rel);
  if (fs.existsSync(jsPath)) {
    const js = fs.readFileSync(jsPath, 'utf8');
    // Escape closing script tags inside bundled JS safely
    const safeJs = js.replace(/<\/script>/gi, '<\\/script>');
    return `<script type="module">\n${safeJs}\n</script>`;
  }
  return match;
});

fs.writeFileSync(outRootHtmlPath, html, 'utf8');
console.log(`Generated standalone single-file game: ${outRootHtmlPath} (${(html.length / 1024).toFixed(1)} KB)`);
