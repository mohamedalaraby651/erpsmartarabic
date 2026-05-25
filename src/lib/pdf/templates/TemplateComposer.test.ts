import { describe, it, expect } from 'vitest';
import {
  composeDocumentBody,
  composeRenderPayload,
} from './TemplateComposer';
import { buildPdfConfig } from '../config/pdfConfigSchema';

describe('composeDocumentBody', () => {
  it('joins required + optional slots inside a typed root section', () => {
    const html = composeDocumentBody({
      rootClass: 'invoice',
      headerSlot: '<header>H</header>',
      bodySlot: '<main>B</main>',
      summarySlot: '<table>S</table>',
      footerSlot: '<footer>F</footer>',
    });
    expect(html).toContain('<section class="invoice">');
    expect(html.indexOf('<header>H</header>')).toBeLessThan(
      html.indexOf('<main>B</main>'),
    );
    expect(html.indexOf('<main>B</main>')).toBeLessThan(
      html.indexOf('<table>S</table>'),
    );
    expect(html.indexOf('<table>S</table>')).toBeLessThan(
      html.indexOf('<footer>F</footer>'),
    );
  });

  it('omits empty optional slots without leaving dangling whitespace', () => {
    const html = composeDocumentBody({
      rootClass: 'q',
      headerSlot: '<h1>A</h1>',
      bodySlot: '<p>B</p>',
    });
    expect(html).not.toMatch(/<\/section>\s*<section/);
    expect(html).toContain('<h1>A</h1>');
    expect(html).toContain('<p>B</p>');
  });
});

describe('composeRenderPayload', () => {
  const config = buildPdfConfig({});

  it('returns css containing typography + body rules and unchanged html when wm off', () => {
    const out = composeRenderPayload({
      html: '<section class="invoice">x</section>',
      bodyCss: '.invoice { color: red; }',
      config,
    });
    expect(out.css).toContain('.invoice { color: red; }');
    // typography vars from buildTypographyRulesCss
    expect(out.css).toMatch(/--pdf-base-fs|font-size/i);
    // no watermark overlay
    expect(out.html).toBe('<section class="invoice">x</section>');
    expect(out.css).not.toMatch(/background-image/);
  });

  it('injects watermark css + overlay div when enabled', () => {
    const wmConfig = buildPdfConfig({
      watermark: {
        enabled: true,
        imageUrl: 'https://cdn.example.com/wm.png',
        opacity: 0.1,
        rotation: -20,
        tiled: false,
      },
    });
    const out = composeRenderPayload({
      html: '<section class="invoice">x</section>',
      bodyCss: '.invoice {}',
      config: wmConfig,
    });
    expect(out.html.startsWith('<div class="pdf-watermark-bg"')).toBe(true);
    expect(out.css).toContain('background-image');
    expect(out.css).toContain('cdn.example.com/wm.png');
  });
});
