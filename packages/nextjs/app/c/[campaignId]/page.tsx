import { Suspense } from "react";
import MiniAppDashboard from "~~/components/miniapp-dashboard";

function LoadingFallback() {
  return <div className="p-4 text-center text-white">Loading application...</div>;
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MiniAppDashboard />
    </Suspense>
  );
}
