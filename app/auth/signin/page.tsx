import { Suspense } from "react";
import { SignInContent, SignInLoading } from "./SignInClient";

export default function SignIn() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}
