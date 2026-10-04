import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CollaborationPanel } from "@/components/planner/CollaborationPanel";

export function SharePlanDialog({
  itineraryId,
  title,
  open,
  onOpenChange,
}: {
  itineraryId: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Share this plan</DialogTitle>
          <DialogDescription>
            {title ? `“${title}” — ` : ""}invite friends who have an ErbilGo account. They get a
            notification and can accept from their History page.
          </DialogDescription>
        </DialogHeader>
        {open && <CollaborationPanel itineraryId={itineraryId} alwaysOpen />}
      </DialogContent>
    </Dialog>
  );
}
