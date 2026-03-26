"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Ungültige Anmeldedaten");
    } else {
      setRedirecting(true);
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center relative overflow-hidden">
      {/* Redirect overlay */}
      {redirecting && (
        <div className="fixed inset-0 z-50 bg-navy-950 flex flex-col items-center justify-center transition-opacity duration-300">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-glow mb-6 animate-pulse">
            <svg viewBox="0 0 20 20" fill="white" className="w-7 h-7">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-white/60 font-medium">Dashboard wird geladen…</span>
          </div>
        </div>
      )}

      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 shadow-glow mb-4">
            <svg viewBox="0 0 20 20" fill="white" className="w-6 h-6">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            CORE<span className="text-blue-400">.kpi</span>
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-blue-300/40 mt-1">
            Hanseaten Personaldienstleistungen
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-2 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none transition-all"
                placeholder="admin@hanseaten.de"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/40 mb-1.5">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Anmelden...
                </span>
              ) : (
                "Anmelden"
              )}
            </button>
          </form>
        </div>

        <p className="text-[10px] text-white/20 text-center mt-6">
          KPI-Dashboard für Personaldisponenten
        </p>
      </div>
    </div>
  );
}
