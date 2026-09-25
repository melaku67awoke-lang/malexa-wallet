import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import AuthScreen from "./components/AuthScreen";
import "./App.css";

type AuthMode = "login" | "signup";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

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

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setShowAuth(true);
  };

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
          <div className="brand">
            <div className="brand-mark">M</div>
            <div>
              <h1>Malexa Wallet</h1>
              <span>Secure digital wallet</span>
            </div>
          </div>
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

  if (session) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark">M</div>
            <div>
              <h1>Malexa Wallet</h1>
              <span>Secure digital wallet</span>
            </div>
          </div>

          <button
            type="button"
            className="header-signout"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </header>

        <main className="app-content">
          <section className="dashboard-card">
            <div className="welcome-badge">ACCOUNT ACTIVE</div>

            <h2>Welcome to Malexa Wallet</h2>

            <p className="dashboard-intro">
              Your wallet account is securely signed in.
            </p>

            <div className="account-info">
              <div>
                <span>Email</span>
                <strong>{session.user.email ?? "Not available"}</strong>
              </div>

              <div>
                <span>Account ID</span>
                <strong>{session.user.id}</strong>
              </div>
            </div>

            <p className="dashboard-note">
              Your wallet dashboard and account features will appear here as
              we continue building the platform.
            </p>
          </section>
        </main>
      </div>
    );
  }

  if (showAuth) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark">M</div>
            <div>
              <h1>Malexa Wallet</h1>
              <span>Secure digital wallet</span>
            </div>
          </div>
        </header>

        <main className="app-content">
          <button
            type="button"
            className="back-button"
            onClick={() => setShowAuth(false)}
          >
            ← Back to Home
          </button>

          <AuthScreen initialMode={authMode} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="landing-header">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <h1>Malexa Wallet</h1>
            <span>Secure digital wallet</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-login"
            onClick={() => openAuth("login")}
          >
            Sign In
          </button>

          <button
            type="button"
            className="header-signup"
            onClick={() => openAuth("signup")}
          >
            Create Account
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">WELCOME TO MALEXA WALLET</div>

            <h2>
              Your money.
              <br />
              <span>Your wallet.</span>
              <br />
              Your control.
            </h2>

            <p>
              A modern digital wallet designed to give you a simple,
              convenient, and secure way to manage your digital assets.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => openAuth("signup")}
              >
                Create Your Account
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => openAuth("login")}
              >
                Sign In
              </button>
            </div>
          </div>

          <div className="wallet-preview">
            <div className="wallet-card">
              <div className="wallet-card-top">
                <span>MALEXA WALLET</span>
                <span>◈</span>
              </div>

              <div className="wallet-balance-label">Available Balance</div>

              <div className="wallet-balance">$0.00</div>

              <div className="wallet-card-bottom">
                <span>Secure Wallet</span>
                <span>••••</span>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="feature-card">
            <div className="feature-icon">🔐</div>
            <h3>Secure</h3>
            <p>
              Your account is protected with secure authentication and
              controlled access.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Digital Wallet</h3>
            <p>
              Manage your wallet account and digital assets from one place.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Simple</h3>
            <p>
              A clean experience designed to make wallet management easier.
            </p>
          </div>
        </section>

        <section className="landing-cta">
          <h2>Ready to get started?</h2>

          <p>Create your Malexa Wallet account and begin your journey.</p>

          <button
            type="button"
            className="primary-button"
            onClick={() => openAuth("signup")}
          >
            Create Account
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <strong>Malexa Wallet</strong>
        <span>Secure digital wallet platform</span>
      </footer>
    </div>
  );
}

export default App;
