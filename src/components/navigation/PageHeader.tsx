import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getRouteLabel } from '@/lib/navigation';

interface PageHeaderProps {
  title?: string;
  description?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  showBack = false,
  actions,
  children,
}: PageHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Generate breadcrumb items from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return {
      label: getRouteLabel(path),
      path,
      isLast: index === pathSegments.length - 1,
    };
  });

  // Add home if not on root
  if (location.pathname !== '/') {
    breadcrumbItems.unshift({
      label: 'الرئيسية',
      path: '/',
      isLast: false,
    });
  }

  const pageTitle = title || getRouteLabel(location.pathname);

  return (
    <div className="mb-6 space-y-4">
      {/* Breadcrumb */}
      {breadcrumbItems.length > 1 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => (
              <BreadcrumbItem key={item.path}>
                {item.isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <>
                    <BreadcrumbLink asChild>
                      <Link to={item.path}>{item.label}</Link>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator>
                      <ChevronLeft className="h-4 w-4" />
                    </BreadcrumbSeparator>
                  </>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Title Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
