"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";

function ErrorNotifier() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "auth_cancelled") {
      addToast("A bejelentkezés megszakítva.", "error", "Bejelentkezés");
      
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (error === "auth_error") {
      addToast("Hiba történt a bejelentkezés során.", "error", "Hiba");
      
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, addToast]);

  return null;
}

export default function AuthErrorNotification() {
  return (
    <Suspense fallback={null}>
      <ErrorNotifier />
    </Suspense>
  );
}
