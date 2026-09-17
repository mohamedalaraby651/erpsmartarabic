import { Fragment, useMemo } from "react";

interface HighlightTextProps {
  text: string;
  query?: string;
}

/**
 * Visual-only match highlighting (OPA-INV-UX-001 / M2).
 * Highlight != query change: this component never filters, sorts or fetches.
 * The query is matched case-insensitively on plain text and rendered as React
 * nodes — no untrusted HTML is ever injected.
 */
export const HighlightText = ({ text, query }: HighlightTextProps) => {
  const parts = useMemo(() => {
    const needle = (query ?? '').trim().toLowerCase();
    if (!needle || !text) return null;
    const haystack = text.toLowerCase();
    const segments: { value: string; match: boolean }[] = [];
    let cursor = 0;
    let index = haystack.indexOf(needle, cursor);
    while (index !== -1) {
      if (index > cursor) segments.push({ value: text.slice(cursor, index), match: false });
      segments.push({ value: text.slice(index, index + needle.length), match: true });
      cursor = index + needle.length;
      index = haystack.indexOf(needle, cursor);
    }
    if (!segments.length) return null;
    if (cursor < text.length) segments.push({ value: text.slice(cursor), match: false });
    return segments;
  }, [text, query]);

  if (!parts) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part.match
            ? <mark className="rounded-sm bg-warning/25 px-0.5 text-inherit">{part.value}</mark>
            : part.value}
        </Fragment>
      ))}
    </>
  );
};
