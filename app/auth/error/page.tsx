import { Suspense } from "react";
import { ErrorContent, ErrorLoading } from "./ErrorClient";

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorLoading />}>
      <ErrorContent />
    </Suspense>
  );
}
