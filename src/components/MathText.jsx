/**
 * MathText — renders a string that may contain LaTeX mixed with plain text.
 *
 * Supported delimiters:
 *   Inline : \( ... \)   or  $ ... $
 *   Block  : \[ ... \]   or  $$ ... $$
 *
 * Uses KaTeX via a CDN link in index.html (no npm import needed for the CSS).
 * The katex JS object is loaded globally via the script tag.
 */

import { useMemo } from 'react';

// Regex: split text into alternating plain / math segments
// Order matters: block before inline so $$ beats $
const SPLIT_RE = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;

function renderSegment(seg, idx) {
  let isBlock = false;
  let math = '';

  if (seg.startsWith('\\[') && seg.endsWith('\\]')) {
    isBlock = true;
    math = seg.slice(2, -2).trim();
  } else if (seg.startsWith('\\(') && seg.endsWith('\\)')) {
    math = seg.slice(2, -2).trim();
  } else if (seg.startsWith('$$') && seg.endsWith('$$')) {
    isBlock = true;
    math = seg.slice(2, -2).trim();
  } else if (seg.startsWith('$') && seg.endsWith('$')) {
    math = seg.slice(1, -1).trim();
  }

  try {
    // window.katex is available because index.html loads katex from CDN
    const html = window.katex.renderToString(math, {
      displayMode: isBlock,
      throwOnError: false,
      strict: false,
    });
    if (isBlock) {
      return (
        <span
          key={idx}
          className="math-block"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    return (
      <span
        key={idx}
        className="math-inline"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    // fallback: show raw
    return <span key={idx}>{seg}</span>;
  }
}

export default function MathText({ text, className = '' }) {
  const parts = useMemo(() => {
    if (!text) return [];
    if (typeof window === 'undefined' || !window.katex) {
      // KaTeX not loaded yet — strip delimiters and show plain
      return [{ type: 'plain', content: text }];
    }

    const segments = text.split(SPLIT_RE);
    return segments.map((seg, i) => {
      if (SPLIT_RE.test(seg)) {
        SPLIT_RE.lastIndex = 0;
        return { type: 'math', content: seg, idx: i };
      }
      SPLIT_RE.lastIndex = 0;
      return { type: 'plain', content: seg, idx: i };
    });
  }, [text]);

  if (!text) return null;

  // If katex isn't loaded yet, just render plain
  if (typeof window === 'undefined' || !window.katex) {
    return <span className={className}>{text}</span>;
  }

  const segments = text.split(SPLIT_RE);

  return (
    <span className={`math-text ${className}`}>
      {segments.map((seg, i) => {
        if (SPLIT_RE.test(seg)) {
          SPLIT_RE.lastIndex = 0;
          return renderSegment(seg, i);
        }
        SPLIT_RE.lastIndex = 0;
        return seg ? <span key={i}>{seg}</span> : null;
      })}
    </span>
  );
}
