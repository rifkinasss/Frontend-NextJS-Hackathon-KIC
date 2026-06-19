"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarTrigger() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      aria-label="Buka atau tutup sidebar"
      onClick={toggleSidebar}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Menu size={20} />
    </Button>
  );
}
