import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Globe, MapPin, Building2, CheckCircle, XCircle } from 'lucide-react';
import SupplierHealthBadge from './SupplierHealthBadge';
import type { Database } from '@/integrations/supabase/types';

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const categoryLabels: Record<string, string> = {
  raw_materials: 'مواد خام', spare_parts: 'قطع غيار', services: 'خدمات',
  equipment: 'معدات', packaging: 'تغليف', logistics: 'خدمات لوجستية', other: 'أخرى',
};

interface SupplierHeroIdentityProps {
  supplier: Supplier;
}

const SupplierHeroIdentity = ({ supplier }: SupplierHeroIdentityProps) => {
  const initials = supplier.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-start gap-4 flex-1 min-w-0">
      <Avatar className="h-20 w-20 border-4 border-background shadow-lg shrink-0">
        <AvatarImage src={supplier.image_url || ''} alt={supplier.name} />
        <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground truncate">{supplier.name}</h1>
          <Badge variant={supplier.is_active ? "default" : "secondary"} className={supplier.is_active ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
            {supplier.is_active ? <><CheckCircle className="h-3 w-3 ml-1" />نشط</> : <><XCircle className="h-3 w-3 ml-1" />غير نشط</>}
          </Badge>
          <SupplierHealthBadge supplierId={supplier.id} />
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {(supplier as any).category && <Badge variant="secondary">{categoryLabels[(supplier as any).category] || (supplier as any).category}</Badge>}
          {(supplier as any).rating > 0 && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{'★'.repeat((supplier as any).rating)}{'☆'.repeat(5 - (supplier as any).rating)}</Badge>}
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-muted-foreground">
          {supplier.contact_person && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{supplier.contact_person}</span>}
          {supplier.phone && <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Phone className="h-4 w-4" />{supplier.phone}</a>}
          {supplier.email && <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Mail className="h-4 w-4" />{supplier.email}</a>}
          {(supplier as any).website && <a href={(supplier as any).website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors"><Globe className="h-4 w-4" />الموقع</a>}
          {(supplier.governorate || supplier.city) && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[supplier.governorate, supplier.city].filter(Boolean).join(' - ')}</span>}
        </div>
      </div>
    </div>
  );
};

export default SupplierHeroIdentity;
