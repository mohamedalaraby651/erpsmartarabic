import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyOnVisibleProps {
  children: ReactNode;
  /** Min height while not yet visible to preserve scroll position */
  minHeight?: number;
  /** rootMargin passed to IntersectionObserver — preload before reaching the viewport */
  rootMargin?: string;
  /** Optional placeholder shown until visible */
  placeholder?: ReactNode;
}

/**
 * Renders children only after the wrapper enters (or nears) the viewport.
 * Once shown, the children remain mounted to avoid re-fetching.
 */
export function LazyOnVisible({
  children,
  minHeight = 240,
  rootMargin = "200px 0px",
  placeholder,
}: LazyOnVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el