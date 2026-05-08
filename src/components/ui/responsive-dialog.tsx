import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * ResponsiveDialog — renders a centered Dialog on desktop and a bottom-sheet
 * Drawer on mobile. Drop-in replacement for `<Dialog>` so existing dialogs can
 * gain native-feeling mobile UX with a single import swap.
 *
 * Usage:
 *   <ResponsiveDialog open={open} onOpenChange={setOpen}>
 *     <ResponsiveDialogContent>
 *       <ResponsiveDialogHeader>
 *         <ResponsiveDialogTitle>...</ResponsiveDialogTitle>
 *         <ResponsiveDialogDescription>...</ResponsiveDialogDescription>
 *       </ResponsiveDialogHeader>
 *       {body}
 *       <ResponsiveDialogFooter>{actions}</ResponsiveDialogFooter>
 *     </ResponsiveDialogContent>
 *   </ResponsiveDialog>
 */

interface BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const MobileCtx = React.createContext<boolean>(false);

export function ResponsiveDialog({ open, onOpenChange, children }: BaseProps) {
  const isMobile = useIsMobile();
  const Root = isMobile ? Drawer : Dialog;
  return (
    <MobileCtx.Provider value={isMobile}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </MobileCtx.Provider>
  );
}

export function ResponsiveDialogContent({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const isMobile = React.useContext(MobileCtx);
  if (isMobile) {
    return (
      <DrawerContent className={cn("max-h-[92vh]", className)}>
        <div className="overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    );
  }
  return <DialogContent className={className}>{children}</DialogContent>;
}

export function ResponsiveDialogHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const isMobile = React.useContext(MobileCtx);
  return isMobile ? (
    <DrawerHeader className={cn("text-right", className)}>{children}</DrawerHeader>
  ) : (
    <DialogHeader className={className}>{children}</DialogHeader>
  );
}

export function ResponsiveDialogTitle({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const isMobile = React.useContext(MobileCtx);
  return isMobile ? (
    <DrawerTitle className={className}>{children}</DrawerTitle>
  ) : (
    <DialogTitle className={className}>{children}</DialogTitle>
  );
}

export function ResponsiveDialogDescription({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const isMobile = React.useContext(MobileCtx);
  return isMobile ? (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  ) : (
    <DialogDescription className={className}>{children}</DialogDescription>
  );
}

export function ResponsiveDialogFooter({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const isMobile = React.useContext(MobileCtx);
  return isMobile ? (
    <DrawerFooter className={cn("pt-2", className)}>{children}</DrawerFooter>
  ) : (
    <DialogFooter className={className}>{children}</DialogFooter>
  );
}
