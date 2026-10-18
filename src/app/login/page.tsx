"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold">Digital Signage</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in with your crockerffa.com or crockerschools.org Google account.
        </p>
        <button
          onClick={signIn}
          className="mt-6 w-full rounded-md border border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-800"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
