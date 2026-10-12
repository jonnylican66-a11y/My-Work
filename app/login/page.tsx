"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login(email.trim(), password);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={19} strokeWidth={1.8} /></div>
          <span>northstar<span className="brand-dot">.</span></span>
        </div>
        <div className="login-intro">
          <p className="eyebrow">YOUR BUSINESS, IN FOCUS</p>
          <h1>Welcome back</h1>
          <p>Sign in to your workspace to pick up where you left off.</p>
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Work email</label>
          <div className="input-wrap">
            <Mail size={17} aria-hidden="true" />
            <input
              autoComplete="email"
              autoFocus
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="label-row">
            <label htmlFor="password">Password</label>
            <span className="muted-link">Your workspace account</span>
          </div>
          <div className="input-wrap">
            <LockKeyhole size={17} aria-hidden="true" />
            <input
              autoComplete="current-password"
              id="password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="icon-button password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <button className="primary-button login-submit" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"} {!loading && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="login-footnote">Protected by secure, encrypted sessions.</p>
      </section>
      <div className="login-decoration" aria-hidden="true">
        <div className="login-decoration-ring ring-one" />
        <div className="login-decoration-ring ring-two" />
        <div className="login-decoration-glow" />
        <span>MAKE EVERY<br />MOVE COUNT.</span>
      </div>
    </main>
  );
}
