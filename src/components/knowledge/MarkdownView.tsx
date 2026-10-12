/**
 * Minimal safe Markdown renderer: builds React elements only (no raw HTML injection).
 * Supports headings, paragraphs, lists, quotes, code blocks, tables, inline code/bold, links.
 * Internal .md links and ADR/RISK ids become in-app links; external links open in a new tab.
 */
import { Fragment, type ReactNode } from 'react';
import { Link } from '@/lib/router-compat';
import { normalizePath } from '@/domain/knowledge';

interface Props {
  content: string;
  path: string;
  /** Resolves an id (ADR-0031) to an in-app href, or null if unknown. */
  hrefForId: (id: string) => string | null;
  hrefForPath: (path: string) => string | null;
}

function inline(text: string, ctx: Props, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))|(\b(?:ADR-\d{4}|RISK-\d{3})\b)/g;
  let last = 0; let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const k = `${keyBase}-${i++}`;
    if (m[1]) out.push(<code key={k} className="rounded bg-muted px-1 py-0.5 text-[0.85em]" dir="ltr">{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{m[2].slice(2, -2)}</strong>);
    else if (m[3]) {
      const label = m[4]; const target = m[5];
      if (/^https?:/i.test(target)) {
        out.push(<a key={k} href={target} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{label}</a>);
      } else {
        const dir = ctx.path.split('/').slice(0, -1).join('/');
        const file = target.split('#')[0];
        const href = file ? ctx.hrefForPath(normalizePath(file.startsWith('/') ? file.slice(1) : `${dir}/${file}`)) : null;
        out.push(href
          ? <Link key={k} to={href} className="text-primary underline underline-offset-2">{label}</Link>
          : <span key={k} className="text-muted-foreground" title="ملف خارج نطاق المصادر أو غير موجود">{label}</span>);
      }
    } else if (m[6]) {
      const href = ctx.hrefForId(m[6]);
      out.push(href ? <Link key={k} to={href} className="text-primary underline underline-offset-2" dir="ltr">{m[6]}</Link> : <span key={k} dir="ltr">{m[6]}</span>);
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const splitRow = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function MarkdownView(props: Props) {
  const lines = props.content.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0; let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;
    if (line.startsWith('```')) {
      const buf: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      blocks.push(<pre key={key} dir="ltr" className="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{buf.join('\n')}</code></pre>);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold', 'text-sm font-semibold', 'text-sm font-semibold'][level - 1];
      const Tag = (`h${Math.min(level + 1, 6)}`) as 'h2';
      blocks.push(<Tag key={key} dir="auto" className={`${cls} mt-5 mb-2`}>{inline(h[2], props, key)}</Tag>);
      i++; continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = splitRow(line); i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push(
        <div key={key} className="my-3 overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50"><tr>{head.map((c, j) => <th key={j} dir="auto" className="px-2 py-1.5 text-start font-semibold">{inline(c, props, `${key}h${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-t">{r.map((c, j) => <td key={j} dir="auto" className="px-2 py-1.5 align-top">{inline(c, props, `${key}r${ri}c${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      const L = ordered ? 'ol' : 'ul';
      blocks.push(<L key={key} className={`my-2 space-y-1 ps-5 text-sm ${ordered ? 'list-decimal' : 'list-disc'}`}>{items.map((t, j) => <li key={j} dir="auto">{inline(t, props, `${key}${j}`)}</li>)}</L>);
      continue;
    }
    if (line.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key} dir="auto" className="my-2 border-s-4 border-border ps-3 text-sm text-muted-foreground">{inline(buf.join(' '), props, key)}</blockquote>);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { blocks.push(<hr key={key} className="my-4 border-border" />); i++; continue; }
    if (!line.trim()) { i++; continue; }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|```|>|\s*\||\s*([-*]|\d+\.)\s)/.test(lines[i])) buf.push(lines[i++]);
    if (buf.length === 0) { buf.push(line); i++; }
    blocks.push(<p key={key} dir="auto" className="my-2 text-sm leading-relaxed">{inline(buf.join(' '), props, key)}</p>);
  }
  return <div className="min-w-0 break-words">{blocks.map((b, j) => <Fragment key={j}>{b}</Fragment>)}</div>;
}
