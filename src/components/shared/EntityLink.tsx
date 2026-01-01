import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type EntityType = 
  | 'customer' 
  | 'supplier' 
  | 'product' 
  | 'employee' 
  | 'invoice' 
  | 'sales-order' 
  | 'purchase-order' 
  | 'quotation' 
  | 'payment';

interface EntityLinkProps {
  type: EntityType;
  id: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const entityRoutes: Record<EntityType, string> = {
  customer: '/customers',
  supplier: '/suppliers',
  product: '/products',
  employee: '/employees',
  invoice: '/invoices',
  'sales-order': '/sales-orders',
  'purchase-order': '/purchase-orders',
  quotation: '/quotations',
  payment: '/payments',
};

export const EntityLink = ({ type, id, children, className, onClick }: EntityLinkProps) => {
  const basePath = entityRoutes[type];
  const to = `${basePath}/${id}`;

  return (
    <Link
      to={to}
      className={cn(
        "text-primary hover:text-primary/80 hover:underline transition-colors font-medium",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
};

export default EntityLink;
