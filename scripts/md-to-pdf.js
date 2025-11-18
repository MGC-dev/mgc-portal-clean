const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const puppeteer = require('puppeteer');

async function main() {
  const root = process.cwd();
  const readmePath = path.join(root, 'README.md');
  const outDir = path.join(root, 'docs');
  const outFile = path.join(outDir, 'MG-Client-Portal.pdf');

  if (!fs.existsSync(readmePath)) {
    throw new Error('README.md not found');
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
  const markdown = fs.readFileSync(readmePath, 'utf-8');
  const body = md.render(markdown);

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>MG Client Portal — Documentation</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #111827; margin: 24px; }
        h1, h2, h3, h4 { color: #0f172a; margin: 1.2em 0 0.5em; }
        h1 { font-size: 28px; }
        h2 { font-size: 22px; }
        h3 { font-size: 18px; }
        p, li { font-size: 14px; }
        code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
        pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow: auto; }
        ul, ol { padding-left: 20px; }
        a { color: #2563eb; text-decoration: none; }
        hr { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; }
      </style>
    </head>
    <body>${body}</body>
  </html>`;

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outFile, format: 'A4', printBackground: true });
  await browser.close();

  console.log(outFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});