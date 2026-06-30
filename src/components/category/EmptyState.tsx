import { Card } from "@/components/ui/card";
import { Store } from "lucide-react";

export function EmptyState({ message }: { message?: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="rounded-full bg-muted p-4">
        <Store className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No results</h3>
      <p className="max-w-md text-sm text-muted-foreground">
        {message ?? "No approved businesses are available in this category yet."}
      </p>
    </Card>
  );
}
