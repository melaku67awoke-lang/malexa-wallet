import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import AuthScreen from "./components/AuthScreen";
import "./App.css";

type AuthMode = "login" | "signup";

type Page =
  | "dashboard"
  | "p2p"
  | "orders"
  | "settings"
  | "help";

type P2PTab = "buy" | "sell";

type OrderTab = "active" | "completed" | "cancelled";

const navigation: Array<{
  id: Page;
  label: string;
  icon: string;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    id: "p2p",
    label: "P2P",
    icon: "⇄",
  },
  {
    id: "orders",
    label: "Orders",
    icon: "▤",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙",
  },
  {
    id: "help",
    label: "Help",
    icon: "?",
  },
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-card">
          <div className="brand-mark">M</div>
          <h1>Malexa Wallet</h1>
          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-shell">
        <LandingPage
          onLogin={() => setAuthMode("login")}
          onSignup={() => setAuthMode("signup")}
        />

        <div className="auth-overlay">
          <AuthScreen
            initialMode={authMode}
            onAuthenticated={(nextSession) => {
              setSession(nextSession);
            }}
          />
        </div>
      </div>
    );
  }

  return <SignedInApp session={session} />;
}

function SignedInApp({ session }: { session: Session }) {
  const [page, setPage] = useState<Page>("dashboard");

  const email = session.user.email ?? "Account";

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="wallet-app">
      <header className="wallet-header">
        <div className="wallet-header-inner">
          <button
            type="button"
            className="wallet-brand-button"
            onClick={() => navigate("dashboard")}
            aria-label="Go to Dashboard"
          >
            <Brand />
          </button>

          <div className="header-account">
            <div className="header-user">
              <span className="header-user-label">Signed in as</span>
              <strong>{email}</strong>
            </div>

            <button
              type="button"
              className="sign-out-button"
              onClick={async () => {
                await supabase.auth.signOut();
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="wallet-main">
        {page === "dashboard" && (
          <DashboardPage onNavigate={navigate} />
        )}

        {page === "p2p" && <P2PPage />}

        {page === "orders" && <OrdersPage />}

        {page === "settings" && <SettingsPage />}

        {page === "help" && <HelpPage />}
      </main>

      <BottomNavigation
        activePage={page}
        onNavigate={navigate}
      />
    </div>
  );
}

function DashboardPage({
  onNavigate,
}: {
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Your account</span>
          <h1>Dashboard</h1>
          <p>
            Manage your balance, P2P activity, orders, and account
            settings.
          </p>
        </div>

        <div className="account-status">
          <span className="status-dot" />
          Account Active
        </div>
      </div>

      <section className="balance-card">
        <div className="balance-card-top">
          <div>
            <span className="balance-label">Total Balance</span>
            <div className="balance-value">$0.00</div>
          </div>

          <div className="balance-symbol">M</div>
        </div>

        <div className="balance-divider" />

        <div className="balance-details">
          <div>
            <span>Available Balance</span>
            <strong>$0.00</strong>
          </div>

          <div>
            <span>Locked Balance</span>
            <strong>$0.00</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>Common account actions</p>
          </div>
        </div>

        <div className="quick-actions">
          <button type="button" className="quick-action">
            <span className="quick-action-icon">↓</span>
            <span>
              <strong>Deposit</strong>
              <small>Add funds to your account</small>
            </span>
          </button>

          <button type="button" className="quick-action">
            <span className="quick-action-icon">↑</span>
            <span>
              <strong>Withdraw</strong>
              <small>Withdraw available funds</small>
            </span>
          </button>

          <button
            type="button"
            className="quick-action"
            onClick={() => onNavigate("p2p")}
          >
            <span className="quick-action-icon">⇄</span>
            <span>
              <strong>P2P Trading</strong>
              <small>Buy and sell through P2P</small>
            </span>
          </button>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Account</h2>
            <p>Manage the important parts of your wallet</p>
          </div>
        </div>

        <div className="dashboard-grid">
          <button
            type="button"
            className="dashboard-tile"
            onClick={() => onNavigate("p2p")}
          >
            <span className="tile-icon">⇄</span>
            <span className="tile-content">
              <strong>P2P Trading</strong>
              <small>Buy and sell assets with other users.</small>
            </span>
            <span className="tile-arrow">›</span>
          </button>

          <button
            type="button"
            className="dashboard-tile"
            onClick={() => onNavigate("orders")}
          >
            <span className="tile-icon">▤</span>
            <span className="tile-content">
              <strong>Orders</strong>
              <small>View active, completed, and cancelled orders.</small>
            </
