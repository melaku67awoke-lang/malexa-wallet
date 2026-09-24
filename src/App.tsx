import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import AuthScreen from "./components/AuthScreen";
import "./App.css";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error("Failed to load session:", error);
        setSession(null);
      } else {
        setSession(session);
      }

      setLoading(false);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Malexa Wallet</h1>
          <p>Secure digital wallet platform</p>
        </header>

        <main className="app-content">
          <section className="status-card">
            <h2>Loading...</h2>
            <p>Checking your account session.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Malexa Wallet</h1>
          <p>Secure digital wallet platform</p>
        </header>

        <main className="app-content">
          <AuthScreen />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Malexa Wallet</h1>
        <p>Secure digital wallet platform</p>
      </header>

      <main className="app-content">
        <section className="status-card">
          <h2>Welcome to Malexa Wallet</h2>

          <p>You are signed in.</p>

          <p>
            <strong>Email:</strong> {session.user.email ?? "Not available"}
          </p>

          <button type="button" onClick={handleSignOut}>
            Sign Out
          </button>
        </section>
      </main>
    </div>
  );
}

export default App;
