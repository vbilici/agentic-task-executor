import { Plus } from "lucide-react";
import { useSessionContext } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

export function HomePage() {
  const { isCreating, createSession } = useSessionContext();

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-bold mb-4">Welcome to Libra</h2>
        <p className="text-muted-foreground mb-6">
          Describe your goal, and I'll help you break it down into actionable tasks
          that can be executed automatically.
        </p>
        <Button onClick={createSession} disabled={isCreating} size="lg">
          {isCreating ? (
            <LoadingIndicator size="sm" text="Creating..." />
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              Start New Session
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
