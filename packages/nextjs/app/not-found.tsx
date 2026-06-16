import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="m-0 mb-1 text-6xl font-bold">404</h1>
        <h2 className="m-0 text-2xl font-semibold">Page Not Found</h2>
        <p className="m-0 mb-6 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
