"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerApi, saveAuth } from "@/lib/authClient";
import { useAuth } from "@/contexts/AuthContext";

function InputField({
  id, label, type = "text", value, onChange, placeholder, autoComplete, optional,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string; optional?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
        {label}
        {optional && <span className="text-slate-400 font-normal text-[11px]">(optional)</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full px-3.5 py-2.5 text-[14px] rounded-lg border border-slate-200 bg-white outline-none transition-all placeholder-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Simple password strength
  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-rose-400", "bg-amber-400", "bg-emerald-400"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerApi({ name: name.trim(), email, password, college: college || undefined });
      saveAuth(res.data.token, res.data.user);
      setUser(res.data.user);
      router.push(res.meta.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200" style={{ background: "var(--ai-gradient)" }}>
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="text-[14px] text-slate-500 mt-1">Discover opportunities tailored for you</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <InputField id="reg-name" label="Full name" value={name} onChange={setName} placeholder="Your name" autoComplete="name" />
          <InputField id="reg-email" label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@college.edu" autoComplete="email" />

          {/* Password with strength bar */}
          <div>
            <InputField id="reg-password" label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" autoComplete="new-password" />
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 flex gap-1">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${strength >= s ? strengthColor : "bg-slate-100"}`} />
                  ))}
                </div>
                <span className={`text-[11px] font-semibold ${strength === 1 ? "text-rose-500" : strength === 2 ? "text-amber-500" : "text-emerald-600"}`}>
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>

          <InputField id="reg-college" label="College / University" value={college} onChange={setCollege} placeholder="e.g. IIT Madras" autoComplete="organization" optional />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg">
              <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <p className="text-[13px] text-rose-700">{error}</p>
            </div>
          )}

          <button
            id="register-submit"
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 text-white text-[14px] font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-[0.98] shadow-md shadow-violet-200 mt-2"
            style={{ background: "var(--ai-gradient)" }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                Creating account…
              </span>
            ) : "Create account"}
          </button>

          <p className="text-[11px] text-slate-400 text-center pt-1">
            By registering you agree to our demo terms.
          </p>
        </form>
      </div>

      <p className="text-center text-[13px] text-slate-500 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
