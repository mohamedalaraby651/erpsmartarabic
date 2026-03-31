/**
 * useInfiniteCustomers — Standardized infinite scroll for customer listings.
 * Manages page accumulation, load-more triggers, and resets on filter changes.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Customer } from "@/lib/customerConstants";

interface UseInfiniteCustomersOptions {
  /** Number of items per page */
  pageSize: number;
  /** Whether we're on mobile viewport */
  isMobile: boolean;
  /** Total number of customers matching filters */
  totalCount: number;
  /** Dependencies that should reset pagination when changed */
  resetDeps: unknown[];
}

interface AccumulateOptions {
  /** Current page data from the query */
  customers: Customer[];
}

export function useInfiniteCustomers({
  pageSize,
  isMobile,
  totalCount,
  resetDeps,
}: UseInfiniteCustomersOptions) {
  const [mobilePages, setMobilePages] = useState<Customer[][]>([]);
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPages, setDesktopPages] = useState<Customer[][]>([]);
  const [desktopPage, setDesktopPage] = useState(1);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const currentPage = isMobile ? mobilePage : desktopPage;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      setIsFetchingNextPage(true);
      if (isMobile) setMobilePage(prev => prev + 1);
      else setDesktopPage(prev => prev + 1);
    }
  }, [hasNextPage, isFetchingNextPage, isMobile]);

  // Reset on filter/sort change
  useEffect(() => {
    setMobilePage(1);
    setDesktopPage(1);
    setMobilePages([]);
    setDesktopPages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  // Desktop sentinel ref + IntersectionObserver
  const desktopSentinelRef = useRef<HTMLDivElement>(null);

  /** Call this in a useEffect after list.customers changes to accumulate pages */
  const accumulate = useCallback((customers: Customer[]) => {
    if (customers.length > 0) {
      if (isMobile) {
        setMobilePages(prev => {
          const updated = [...prev];
          updated[mobilePage - 1] = customers;
          return updated;
        });
      } else {
        setDesktopPages(prev => {
          const updated = [...prev];
          updated[desktopPage - 1] = customers;
          return updated;
        });
      }
      setIsFetchingNextPage(false);
    }
  }, [isMobile, mobilePage, desktopPage]);

  // All accumulated data
  const allData = useMemo(() => {
    return isMobile ? mobilePages.flat() : desktopPages.flat();
  }, [isMobile, mobilePages, desktopPages]);

  // Desktop observer
  useEffect(() => {
    if (isMobile || !hasNextPage || isFetchingNextPage) return;
    const el = desktopSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) handleLoadMore(); },
      { threshold: 0.1, rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, hasNextPage, isFetchingNextPage, handleLoadMore, allData.length]);

  return {
    currentPage,
    allData,
    hasNextPage,
    isFetchingNextPage,
    handleLoadMore,
    desktopSentinelRef,
    accumulate,
  };
}
