import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  onClick: () => void;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function PrintButton({ 
  onClick, 
  label = "طباعة", 
  variant = "outline",
  size = "default" 
}: PrintButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={onClick}>
      <Printer className="h-4 w-4 ml-2" />
      {label}
    </Button>
  );
}
