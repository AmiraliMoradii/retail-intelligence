import { Link } from "react-router";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/BrandMark";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-6 text-center">
      <BrandMark />
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-6" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-page-title">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">The page you're looking for doesn't exist in this prototype.</p>
      </div>
      <Button asChild>
        <Link to="/overview">Back to Store Overview</Link>
      </Button>
    </div>
  );
}
