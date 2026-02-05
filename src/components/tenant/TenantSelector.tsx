 import React, { forwardRef } from 'react';
import { Check, ChevronDown, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';
import { cn } from '@/lib/utils';

 export const TenantSelector = forwardRef<HTMLButtonElement, React.HTMLAttributes<HTMLButtonElement>>(
   function TenantSelector(props, ref) {
     const { 
       tenant, 
       userTenants, 
       isLoading, 
       hasManyTenants, 
       switchToTenant,
       isLoadingTenants
     } = useTenant();
 
     // Don't show if user has only one tenant
     if (!hasManyTenants && !isLoadingTenants) {
       return null;
    }
 
     if (isLoading || isLoadingTenants) {
       return (
         <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
           <Building2 className="h-4 w-4 animate-pulse" />
           <span>جاري التحميل...</span>
         </div>
       );
    }
 
     const handleSwitchTenant = async (tenantId: string) => {
       if (tenantId === tenant?.id) return;
       
       const success = await switchToTenant(tenantId);
       if (success) {
         window.location.reload();
       }
     };
 
     const getTierBadge = (tier: string) => {
       switch (tier) {
         case 'enterprise':
           return <Badge variant="default" className="text-xs">مؤسسة</Badge>;
         case 'professional':
           return <Badge variant="secondary" className="text-xs">احترافي</Badge>;
         default:
           return <Badge variant="outline" className="text-xs">أساسي</Badge>;
       }
     };
 
     return (
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button 
             ref={ref}
             variant="outline" 
             className="w-full justify-between gap-2"
             dir="rtl"
             {...props}
           >
             <div className="flex items-center gap-2 truncate">
               <Building2 className="h-4 w-4 shrink-0 text-primary" />
               <span className="truncate">{tenant?.name || 'اختر شركة'}</span>
             </div>
             <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent className="w-64" align="start">
           {userTenants.map((ut) => {
             const isActive = ut.tenant_id === tenant?.id;
             return (
               <DropdownMenuItem
                 key={ut.id}
                 onClick={() => handleSwitchTenant(ut.tenant_id)}
                 className={cn(
                   "flex items-center justify-between gap-2 cursor-pointer",
                   isActive && "bg-accent"
                 )}
               >
                 <div className="flex items-center gap-2 flex-1 min-w-0">
                   <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                   <div className="flex flex-col min-w-0">
                     <span className="truncate font-medium">
                       {ut.tenant?.name || 'شركة غير معروفة'}
                     </span>
                     <span className="text-xs text-muted-foreground truncate">
                       {ut.role === 'owner' ? 'مالك' : ut.role === 'admin' ? 'مدير' : 'عضو'}
                     </span>
                   </div>
                </div>
                 <div className="flex items-center gap-2 shrink-0">
                   {ut.tenant?.subscription_tier && getTierBadge(ut.tenant.subscription_tier)}
                   {isActive && <Check className="h-4 w-4 text-primary" />}
                 </div>
               </DropdownMenuItem>
             );
           })}
         </DropdownMenuContent>
       </DropdownMenu>
     );
   }
 );

 TenantSelector.displayName = 'TenantSelector';
export default TenantSelector;
