import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import AuthScreen from "./components/AuthScreen";
import "./App.css";

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

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(currentSession);
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
        <LandingPage />
        <div className="auth-overlay">
          <AuthScreen />
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
          <button
            type="button"
            className="quick-action"
            onClick={() => onNavigate("help")}
          >
            <span className="quick-action-icon">↓</span>

            <span>
              <strong>Deposit</strong>
              <small>Add funds to your account</small>
            </span>
          </button>

          <button
            type="button"
            className="quick-action"
            onClick={() => onNavigate("help")}
          >
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
              <small>
                Buy and sell assets with other users.
              </small>
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
              <small>
                View active, completed, and cancelled orders.
              </small>
            </span>

            <span className="tile-arrow">›</span>
          </button>

          <button
            type="button"
            className="dashboard-tile"
            onClick={() => onNavigate("settings")}
          >
            <span className="tile-icon">⚙</span>

            <span className="tile-content">
              <strong>Settings</strong>
              <small>
                Manage KYC and your saved payment account.
              </small>
            </span>

            <span className="tile-arrow">›</span>
          </button>

          <button
            type="button"
            className="dashboard-tile"
            onClick={() => onNavigate("help")}
          >
            <span className="tile-icon">?</span>

            <span className="tile-content">
              <strong>Help Center</strong>
              <small>
                Get help with your account and transactions.
              </small>
            </span>

            <span className="tile-arrow">›</span>
          </button>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Recent Activity</h2>
            <p>Your latest wallet activity will appear here.</p>
          </div>
        </div>

        <div className="empty-state">
          <div className="empty-state-icon">▤</div>
          <h3>No recent transactions</h3>
          <p>
            Your deposits, withdrawals, and P2P transactions will
            appear here.
          </p>
        </div>
      </section>
    </div>
  );
}

function P2PPage() {
  const [tab, setTab] = useState<P2PTab>("buy");

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Peer to peer</span>
          <h1>P2P Trading</h1>
          <p>
            Buy and sell with other Malexa Wallet users.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
        >
          + Create Advertisement
        </button>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className={tab === "buy" ? "tab active" : "tab"}
          onClick={() => setTab("buy")}
        >
          Buy
        </button>

        <button
          type="button"
          className={tab === "sell" ? "tab active" : "tab"}
          onClick={() => setTab("sell")}
        >
          Sell
        </button>
      </div>

      <section className="section-block">
        <div className="filter-row">
          <div className="filter-box">
            <span>Asset</span>
            <strong>USDT</strong>
          </div>

          <div className="filter-box">
            <span>Currency</span>
            <strong>USD</strong>
          </div>

          <div className="filter-box">
            <span>Payment</span>
            <strong>All payment methods</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>
              {tab === "buy"
                ? "Buy Advertisements"
                : "Sell Advertisements"}
            </h2>

            <p>
              Available P2P advertisements will appear here.
            </p>
          </div>
        </div>

        <div className="empty-state">
          <div className="empty-state-icon">⇄</div>

          <h3>No advertisements yet</h3>

          <p>
            There are currently no matching P2P advertisements.
            Create an advertisement or check again later.
          </p>
        </div>
      </section>
    </div>
  );
}

function OrdersPage() {
  const [tab, setTab] = useState<OrderTab>("active");

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Trading history</span>
          <h1>Orders</h1>
          <p>
            Track your active, completed, and cancelled P2P
            orders.
          </p>
        </div>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className={tab === "active" ? "tab active" : "tab"}
          onClick={() => setTab("active")}
        >
          Active
        </button>

        <button
          type="button"
          className={
            tab === "completed" ? "tab active" : "tab"
          }
          onClick={() => setTab("completed")}
        >
          Completed
        </button>

        <button
          type="button"
          className={
            tab === "cancelled" ? "tab active" : "tab"
          }
          onClick={() => setTab("cancelled")}
        >
          Cancelled
        </button>
      </div>

      <section className="section-block">
        <div className="empty-state">
          <div className="empty-state-icon">▤</div>

          <h3>
            {tab === "active"
              ? "No active orders"
              : tab === "completed"
                ? "No completed orders"
                : "No cancelled orders"}
          </h3>

          <p>
            {tab === "active"
              ? "Your active P2P orders will appear here."
              : tab === "completed"
                ? "Completed P2P orders will appear here."
                : "Cancelled advertisements and orders will appear here."}
          </p>
        </div>
      </section>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Account management</span>
          <h1>Settings</h1>
          <p>
            Manage your profile, KYC verification, and payment
            account.
          </p>
        </div>
      </div>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Profile</h2>
            <p>Your Malexa Wallet account</p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">Account status</span>
              <strong>Active</strong>
            </div>

            <span className="settings-badge">
              Active
            </span>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>KYC Verification</h2>
            <p>
              Complete verification to use features that require
              identity verification.
            </p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">Verification status</span>
              <strong>Not submitted</strong>
            </div>

            <button
              type="button"
              className="secondary-button"
            >
              Open KYC
            </button>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Payment Account</h2>
            <p>
              Save the payment account you use for P2P
              transactions.
            </p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">
                Saved payment account
              </span>
              <strong>Not configured</strong>
            </div>

            <button
              type="button"
              className="secondary-button"
            >
              Add Account
            </button>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Security</h2>
            <p>Keep your account secure.</p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">Authentication</span>
              <strong>Supabase Authentication</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HelpPage() {
  const categories = [
    {
      title: "P2P DISPUTE",
      description:
        "Get help with an active or completed P2P transaction.",
    },
    {
      title: "ACCOUNT LOGIN ISSUE",
      description:
        "Get help if you cannot sign in or access your account.",
    },
    {
      title: "WITHDRAW",
      description:
        "Questions about withdrawing funds from your wallet.",
    },
    {
      title: "DEPOSIT",
      description:
        "Questions about depositing funds into your wallet.",
    },
    {
      title: "OTHER",
      description:
        "Other questions or account support requests.",
    },
  ];

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Support</span>
          <h1>Help Center</h1>
          <p>
            Choose a category to get help with your account.
          </p>
        </div>
      </div>

      <section className="section-block">
        <div className="help-category-list">
          {categories.map((category) => (
            <button
              type="button"
              className="help-category"
              key={category.title}
            >
              <span className="help-category-icon">?</span>

              <span className="help-category-content">
                <strong>{category.title}</strong>
                <small>{category.description}</small>
              </span>

              <span className="tile-arrow">›</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BottomNavigation({
  activePage,
  onNavigate,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <nav className="bottom-navigation">
      {navigation.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            activePage === item.id
              ? "bottom-nav-item active"
              : "bottom-nav-item"
          }
          onClick={() => onNavigate(item.id)}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <Brand />

        <span className="eyebrow">Digital wallet</span>

        <h1>Welcome to Malexa Wallet</h1>

        <p>
          Manage your account, trade through P2P, and keep your
          wallet activity in one place.
        </p>

        <div className="landing-features">
          <div>
            <span>✓</span>
            <strong>Secure account access</strong>
          </div>

          <div>
            <span>✓</span>
            <strong>P2P trading</strong>
          </div>

          <div>
            <span>✓</span>
            <strong>Account management</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">M</div>

      <div className="brand-text">
        <strong>Malexa</strong>
        <span>Wallet</span>
      </div>
    </div>
  );
}

export default App;
