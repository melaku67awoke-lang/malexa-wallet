import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

type AuthMode = "login" | "signup";

interface AuthScreenProps {
  initialMode?: AuthMode;
}

export default function AuthScreen({
  initialMode = "login",
}: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setMessage("");
  }, [initialMode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setMessage("Login successful.");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setMessage(
          "Registration successful. Check your email if email confirmation is enabled."
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((currentMode) =>
      currentMode === "login" ? "signup" : "login"
    );
    setMessage("");
  };

  return (
    <section className="auth-screen">
      <div className="auth-card">
        <h2>{mode === "login" ? "Welcome Back" : "Create Your Account"}</h2>

        <p>
          {mode === "login"
            ? "Sign in to your Malexa Wallet account."
            : "Create your Malexa Wallet account."}
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={8}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {message && (
          <p role="status" className="auth-message">
            {message}
          </p>
        )}

        <button
          type="button"
          className="auth-switch"
          onClick={switchMode}
        >
          {mode === "login"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </section>
  );
}
