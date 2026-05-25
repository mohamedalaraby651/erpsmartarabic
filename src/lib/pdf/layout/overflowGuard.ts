/**
 * Overflow containment (Wave 17).
 *
 * Inspects a rendered container and progressively shrinks font-size or
 * enables word-break on cells whose content overflows their box. Pure
 * DOM, runs once before html2canvas snapshot.
 */
export interface OverflowGuardOptions {
  selector?: string;          // cells to scan
  steps?: number[];           // font-size px ladder
  enableWordBreak?: boolean;  // last-resort word-break
}

const DEFAULT_STEPS = [12, 11, 10, 9, 8];

export interface OverflowReport {
  inspected: number;
  shrunk: number;
  wrapped: number;
}

function isOverflowing(el: HTMLElement): boolean {
  return el.scrollWidth - el.clientWidth > 1 || el.scrollHeight - el.clientHeight > 1;
}

export function applyOverflowGuard(
  root: HTMLElement,
  opts: OverflowGuardOptions = {},
): OverflowReport {
  const selector = opts.selector ?? 'td, th, .overflow-guard';
  const steps = opts.steps ?? DEFAULT_STEPS;
  const enableWordBreak = opts.enableWordBreak !== false;

  const cells = Array.from(root.querySelectorAll<HTMLElement>(selector));
  let shrunk = 0;
  let wrapped = 0;

  for (const cell of cells) {
    if (!isOverflowing(cell)) continue;
    let stepped = false;
    for (const px of steps) {
      cell.style.fontSize = `${px}px`;
      if (!isOverflowing(cell)) {
        stepped = true;
        shrunk++;
        break;
      }
    }
    if (!stepped && enableWordBreak) {
      cell.style.wordBreak = 'break-word';
      cell.style.overflowWrap = 'anywhere';
      wrapped++;
    }
  }

  return { inspected: cells.length, shrunk, wrapped };
}
