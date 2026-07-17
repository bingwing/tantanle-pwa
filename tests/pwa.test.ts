import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('pwa and github pages setup', () => {
  it('uses relative page links for GitHub Pages project paths', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

    expect(html).toContain('href="./manifest.webmanifest"');
    expect(html).toContain('href="./icons/icon.svg"');
  });

  it('uses a relative Vite base', () => {
    const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

    expect(viteConfig).toContain("base: './'");
  });

  it('has a GitHub Pages action workflow', () => {
    const workflow = readFileSync(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');

    expect(workflow).toContain('actions/deploy-pages');
    expect(workflow).toContain('enablement: true');
    expect(workflow).toContain('npm run build');
  });
});
