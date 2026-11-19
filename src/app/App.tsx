import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { AppProviders } from "./providers/AppProviders";
import { PageLoading } from "@/components/shared/LoadingState";

export default function App() {
  return (
    <AppProviders>
      <Suspense
        fallback={
          <div className="mx-auto max-w-5xl p-8">
            <PageLoading />
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  );
}
