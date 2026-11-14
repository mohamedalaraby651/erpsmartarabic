/**
 * Scroll to and focus the first invalid field (decision 353).
 * Returns the number of invalid fields found.
 */
export function scrollToFirstError(root: ParentNode = document): number {
  const invalid = root.querySelectorAll<HTMLElement>('[aria-invalid="true"]');
  const first = invalid[0];
  if (first) {
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first.focus({ preventScroll: true });
  }
  return invalid.length;
}
