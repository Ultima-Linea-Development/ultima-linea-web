import Box from "@/components/layout/Box";
import Typography from "@/components/ui/Typography";
import { ADMIN_PAGE_PADDING_CLASS } from "@/components/admin/AdminTable";
import AdminSectionLinks from "./AdminSectionLinks";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  return (
    <Box display="flex" direction="col" gap="6" className="w-full min-w-0">
      <div className={cn("flex flex-col gap-6", ADMIN_PAGE_PADDING_CLASS)}>
        <Typography variant="h1">Administración</Typography>
      </div>
      <div className={cn("w-full min-w-0", ADMIN_PAGE_PADDING_CLASS)}>
        <AdminSectionLinks />
      </div>
    </Box>
  );
}
