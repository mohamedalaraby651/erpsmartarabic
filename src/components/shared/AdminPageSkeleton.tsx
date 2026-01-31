/**
 * AdminPageSkeleton - Skeleton loader for admin/settings pages
 * 
 * Props:
 * - variant: 'table' | 'cards' | 'form' - Layout variant
 * - showHeader: boolean - Whether to show page header skeleton
 * - rows: number - Number of table rows or cards to show
 */

import React, { forwardRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/table-skeleton';

interface AdminPageSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'table' | 'cards' | 'form';
  showHeader?: boolean;
  rows?: number;
  columns?: number;
}

export const AdminPageSkeleton = forwardRef<HTMLDivElement, AdminPageSkeletonProps>(
  function AdminPageSkeleton({
    variant = 'table',
    showHeader = true,
    rows = 5,
    columns = 5,
    ...props
  }, ref) {
    return (
      <div ref={ref} className="space-y-6 animate-fade-in" {...props}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      )}

      {/* Content */}
      {variant === 'table' ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={rows} columns={columns} />
          </CardContent>
        </Card>
      ) : variant === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-6">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="pt-4">
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    );
  }
);

AdminPageSkeleton.displayName = 'AdminPageSkeleton';

// Settings page specific skeleton
export const SettingsPageSkeleton = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SettingsPageSkeleton(props, ref) {
    return (
      <div ref={ref} className="space-y-6 animate-fade-in" {...props}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-lg shrink-0" />
          ))}
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
);

SettingsPageSkeleton.displayName = 'SettingsPageSkeleton';
