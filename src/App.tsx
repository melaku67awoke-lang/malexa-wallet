import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

type Page =
  | "dashboard"
  | "deposit"
  | "withdraw"
  | "p2p"
  | "create-ad"
  | "orders"
  | "settings"
  | "help";

type P2PTab = "buy" | "sell";
type OrderTab = "active" | "completed" | "cancelled";

type DepositAddressResponse = {
  success?: boolean;
  existing?: boolean;
  address?: string;
  address_required?: boolean;
  message?: string;
  error?: string;
  network?: string;
  asset?: string;
};

type Advertisement = {
  id: string;
  type: "buy" | "sell";
  amount: string;
  price: string;
  paymentMethod: string;
  status: "active" | "cancelled";
};

type Order = {
  id: string;
  type: "buy" | "sell";
  amount: string;
  price: string;
  status: "active" | "completed" | "cancelled";
};

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">M</div>
      <div>
        <div className="brand-name">Malexa</div>
        <div className="brand-subtitle">Wallet</div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-inner">
        <Brand />

        <div className="landing-content">
          <div className="eyebrow">Secure digital wallet</div>
          <h1>Manage your digital assets with Malexa Wallet.</h1>
          <p>
            Buy, sell, deposit, withdraw, and manage your account from one
            simple wallet.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage(
          "Registration successful. Check your email to confirm your account.",
        );
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) {
          throw signInError;
        }

        setMessage("Signed in successfully.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <Brand />

        <div className="auth-tabs">
          <button
            className={mode === "signin" ? "active" : ""}
            onClick={() => {
              setMode("signin");
              setMessage("");
              setError("");
            }}
          >
            Sign In
          </button>

          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setMessage("");
              setError("");
            }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              minLength={6}
            />
          </label>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <button className="primary-button" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage({
  session,
  setPage,
}: {
  session: Session;
  setPage: (page: Page) => void;
}) {
  const email = session.user.email ?? "User";

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>Welcome back</h1>
          <p>{email}</p>
        </div>
      </div>

      <div className="balance-card">
        <div className="balance-label">Total Balance</div>
        <div className="balance-value">$0.00</div>
        <div className="balance-note">USDT</div>
      </div>

      <div className="quick-actions">
        <button onClick={() => setPage("deposit")}>
          <span>↓</span>
          <strong>Deposit</strong>
          <small>USDT BEP-20</small>
        </button>

        <button onClick={() => setPage("withdraw")}>
          <span>↑</span>
          <strong>Withdraw</strong>
          <small>Send USDT</small>
        </button>

        <button onClick={() => setPage("p2p")}>
          <span>⇄</span>
          <strong>P2P</strong>
          <small>Buy or sell</small>
        </button>
      </div>

      <div className="section-title">Assets</div>

      <div className="asset-card">
        <div className="asset-icon">₮</div>

        <div className="asset-info">
          <strong>USDT</strong>
          <span>Tether USD</span>
        </div>

        <div className="asset-balance">
          <strong>0.00 USDT</strong>
          <span>$0.00</span>
        </div>
      </div>
    </div>
  );
}

function DepositPage({
  setPage,
}: {
  setPage: (page: Page) => void;
}) {
  const [depositAddress, setDepositAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function getDepositAddress() {
    setLoading(true);
    setError("");
    setMessage("");
    setCopied(false);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke<DepositAddressResponse>(
          "get-deposit-address",
          {
            body: {
              action: "get_deposit_address",
            },
          },
        );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data) {
        throw new Error("No response was returned by the deposit service.");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.address) {
        setDepositAddress(data.address);
        setMessage(
          "Your personal USDT BEP-20 deposit address is ready.",
        );
        return;
      }

      if (data.address_required) {
        setMessage(
          data.message ||
            "Your USDT BEP-20 deposit address has not been assigned yet.",
        );
        return;
      }

      setMessage(
        data.message ||
          "No deposit address is currently available.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to get your deposit address.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyAddress() {
    if (!depositAddress) return;

    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Unable to copy the address.");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button
          className="secondary-button"
          onClick={() => setPage("dashboard")}
        >
          ← Back
        </button>

        <div>
          <div className="eyebrow">USDT Deposit</div>
          <h1>Deposit</h1>
          <p>
            Deposit USDT to your Malexa Wallet using the BEP-20
            network.
          </p>
        </div>
      </div>

      <div className="form-card">
        <div className="info-row">
          <span>Asset</span>
          <strong>USDT</strong>
        </div>

        <div className="info-row">
          <span>Network</span>
          <strong>BEP-20</strong>
        </div>

        <div className="info-row">
          <span>Deposit method</span>
          <strong>Personal deposit address</strong>
        </div>

        <p className="form-help">
          Each Malexa Wallet user will receive a unique BEP-20
          deposit address.
        </p>

        {!depositAddress && (
          <button
            className="primary-button"
            onClick={getDepositAddress}
            disabled={loading}
          >
            {loading
              ? "Getting Deposit Address..."
              : "Get Deposit Address"}
          </button>
        )}

        {depositAddress && (
          <div className="deposit-address-box">
            <div className="field-label">Your BEP-20 address</div>

            <div className="deposit-address">
              {depositAddress}
            </div>

            <button
              className="secondary-button"
              onClick={copyAddress}
            >
              {copied ? "Copied" : "Copy Address"}
            </button>

            <button
              className="secondary-button"
              onClick={getDepositAddress}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh Address"}
            </button>
          </div>
        )}

        {message && (
          <div className="success-message">{message}</div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="warning-box">
          Send only <strong>USDT</strong> using the{" "}
          <strong>BEP-20</strong> network to this address.
        </div>
      </div>
    </div>
  );
}

function WithdrawPage({
  setPage,
}: {
  setPage: (page: Page) => void;
}) {
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");

  const fee = 0.4;
  const numericAmount = Number(amount) || 0;
  const totalDebited =
    numericAmount > 0 ? numericAmount + fee : 0;

  return (
    <div className="page">
      <div className="page-header">
        <button
          className="secondary-button"
          onClick={() => setPage("dashboard")}
        >
          ← Back
        </button>

        <div>
          <div className="eyebrow">USDT Withdrawal</div>
          <h1>Withdraw</h1>
          <p>Send USDT from your Malexa Wallet.</p>
        </div>
      </div>

      <div className="form-card">
        <label>
          BEP-20 Address
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="0x..."
          />
        </label>

        <label>
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </label>

        <div className="fee-preview">
          <div>
            <span>Withdrawal amount</span>
            <strong>${numericAmount.toFixed(2)}</strong>
          </div>

          <div>
            <span>Platform fee</span>
            <strong>$0.40</strong>
          </div>

          <div>
            <span>Total debited</span>
            <strong>${totalDebited.toFixed(2)}</strong>
          </div>
        </div>

        <button className="primary-button">
          Withdraw USDT
        </button>
      </div>
    </div>
  );
}

function P2PPage({
  tab,
  setTab,
  advertisements,
  setPage,
}: {
  tab: P2PTab;
  setTab: (tab: P2PTab) => void;
  advertisements: Advertisement[];
  setPage: (page: Page) => void;
}) {
  const visibleAds = advertisements.filter(
    (ad) => ad.status === "active" && ad.type === tab,
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Peer to Peer</div>
          <h1>P2P</h1>
          <p>Buy or sell USDT directly with other users.</p>
        </div>
      </div>

      <div className="segmented-control">
        <button
          className={tab === "buy" ? "active" : ""}
          onClick={() => setTab("buy")}
        >
          Buy
        </button>

        <button
          className={tab === "sell" ? "active" : ""}
          onClick={() => setTab("sell")}
        >
          Sell
        </button>
      </div>

      <button
        className="primary-button"
        onClick={() => setPage("create-ad")}
      >
        Create Advertisement
      </button>

      <div className="section-title">
        {tab === "buy" ? "Buy USDT" : "Sell USDT"}
      </div>

      {visibleAds.length === 0 ? (
        <div className="empty-card">
          <strong>No active advertisements</strong>
          <p>
            Active {tab} advertisements will appear here.
          </p>
        </div>
      ) : (
        visibleAds.map((ad) => (
          <div className="p2p-card" key={ad.id}>
            <div>
              <strong>
                {ad.type === "buy" ? "Buy" : "Sell"} USDT
              </strong>
              <span>Amount: {ad.amount} USDT</span>
            </div>

            <div>
              <strong>${ad.price}</strong>
              <span>{ad.paymentMethod}</span>
            </div>

            <button className="secondary-button">
              Trade
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function CreateAdvertisement({
  setPage,
}: {
  setPage: (page: Page) => void;
}) {
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  return (
    <div className="page">
      <div className="page-header">
        <button
          className="secondary-button"
          onClick={() => setPage("p2p")}
        >
          ← Back
        </button>

        <div>
          <div className="eyebrow">P2P</div>
          <h1>Create Advertisement</h1>
          <p>Create a P2P buy or sell advertisement.</p>
        </div>
      </div>

      <div className="form-card">
        <div className="segmented-control">
          <button
            className={type === "buy" ? "active" : ""}
            onClick={() => setType("buy")}
          >
            Buy
          </button>

          <button
            className={type === "sell" ? "active" : ""}
            onClick={() => setType("sell")}
          >
            Sell
          </button>
        </div>

        <label>
          Amount
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="USDT amount"
          />
        </label>

        <label>
          Price
          <input
            type="number"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Price per USDT"
          />
        </label>

        <label>
          Payment Method
          <input
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value)
            }
            placeholder="Payment method"
          />
        </label>

        <button className="primary-button">
          Publish Advertisement
        </button>
      </div>
    </div>
  );
}

function OrdersPage({
  tab,
  setTab,
  orders,
}: {
  tab: OrderTab;
  setTab: (tab: OrderTab) => void;
  orders: Order[];
}) {
  const visibleOrders = orders.filter(
    (order) => order.status === tab,
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Orders</div>
          <h1>Orders</h1>
          <p>Track your P2P orders.</p>
        </div>
      </div>

      <div className="segmented-control three">
        <button
          className={tab === "active" ? "active" : ""}
          onClick={() => setTab("active")}
        >
          Active
        </button>

        <button
          className={tab === "completed" ? "active" : ""}
          onClick={() => setTab("completed")}
        >
          Completed
        </button>

        <button
          className={tab === "cancelled" ? "active" : ""}
          onClick={() => setTab("cancelled")}
        >
          Cancelled
        </button>
      </div>

      {visibleOrders.length === 0 ? (
        <div className="empty-card">
          <strong>No {tab} orders</strong>
          <p>Your {tab} orders will appear here.</p>
        </div>
      ) : (
        visibleOrders.map((order) => (
          <div className="order-card" key={order.id}>
            <div>
              <strong>
                {order.type === "buy" ? "Buy" : "Sell"} USDT
              </strong>
              <span>{order.amount} USDT</span>
            </div>

            <div>
              <strong>${order.price}</strong>
              <span>{order.status}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SettingsPage({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const [depositAddress, setDepositAddress] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  async function loadDepositAddress() {
    setLoadingAddress(true);
    setAddressError("");

    try {
      const { data, error } =
        await supabase.functions.invoke<DepositAddressResponse>(
          "get-deposit-address",
          {
            body: {
              action: "get_deposit_address",
            },
          },
        );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.address) {
        setDepositAddress(data.address);
      } else {
        setAddressError(
          data?.message ||
            "No deposit address is currently assigned.",
        );
      }
    } catch (err) {
      setAddressError(
        err instanceof Error
          ? err.message
          : "Unable to load deposit address.",
      );
    } finally {
      setLoadingAddress(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Settings</h1>
          <p>Manage your Malexa Wallet account.</p>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-icon">K</div>

        <div>
          <strong>KYC Verification</strong>
          <span>Complete and manage your verification.</span>
        </div>

        <button className="secondary-button">
          Open
        </button>
      </div>

      <div className="settings-card">
        <div className="settings-icon">P</div>

        <div>
          <strong>Payment Account</strong>
          <span>
            Save payment details for P2P transactions.
          </span>
        </div>

        <button className="secondary-button">
          Manage
        </button>
      </div>

      <div className="settings-card">
        <div className="settings-icon">₮</div>

        <div>
          <strong>USDT Deposit Address</strong>
          <span>
            Your personal BEP-20 deposit address.
          </span>
        </div>
      </div>

      <div className="form-card">
        {depositAddress ? (
          <>
            <div className="field-label">
              Personal BEP-20 address
            </div>

            <div className="deposit-address">
              {depositAddress}
            </div>
          </>
        ) : (
          <button
            className="secondary-button"
            onClick={loadDepositAddress}
            disabled={loadingAddress}
          >
            {loadingAddress
              ? "Loading..."
              : "Load Deposit Address"}
          </button>
        )}

        {addressError && (
          <div className="error-message">{addressError}</div>
        )}
      </div>

      <div className="account-card">
        <div className="field-label">Signed in as</div>
        <strong>
          {session.user.email || "User"}
        </strong>
      </div>

      <button
        className="danger-button"
        onClick={onSignOut}
      >
        Sign Out
      </button>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Support</div>
          <h1>Help Center</h1>
          <p>Get help with your Malexa Wallet account.</p>
        </div>
      </div>

      <div className="help-card">
        <strong>Account Login Issue</strong>
        <span>
          Get help when you cannot access your account.
        </span>
      </div>

      <div className="help-card">
        <strong>P2P Dispute</strong>
        <span>
          Get help with a P2P transaction dispute.
        </span>
      </div>

      <div className="help-card">
        <strong>Withdraw</strong>
        <span>Get help with withdrawals.</span>
      </div>

      <div className="help-card">
        <strong>Deposit</strong>
        <span>
          Get help with USDT BEP-20 deposits.
        </span>
      </div>

      <div className="help-card">
        <strong>Other</strong>
        <span>
          Contact support about another issue.
        </span>
      </div>
    </div>
  );
}

function BottomNavigation({
  page,
  setPage,
}: {
  page: Page;
  setPage: (page: Page) => void;
}) {
  const items: {
    page: Page;
    icon: string;
    label: string;
  }[] = [
    {
      page: "dashboard",
      icon: "⌂",
      label: "Dashboard",
    },
    {
      page: "p2p",
      icon: "⇄",
      label: "P2P",
    },
    {
      page: "orders",
      icon: "▤",
      label: "Orders",
    },
    {
      page: "settings",
      icon: "⚙",
      label: "Settings",
    },
    {
      page: "help",
      icon: "?",
      label: "Help",
    },
  ];

  return (
    <nav className="bottom-navigation">
      {items.map((item) => (
        <button
          key={item.page}
          className={page === item.page ? "active" : ""}
          onClick={() => setPage(item.page)}
        >
          <span>{item.icon}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

function SignedInApp({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const [page, setPage] = useState<Page>("dashboard");
  const [p2pTab, setP2PTab] = useState<P2PTab>("buy");
  const [orderTab, setOrderTab] =
    useState<OrderTab>("active");

  const [advertisements] = useState<Advertisement[]>([]);
  const [orders] = useState<Order[]>([]);

  function renderPage() {
    switch (page) {
      case "dashboard":
        return (
          <DashboardPage
            session={session}
            setPage={setPage}
          />
        );

      case "deposit":
        return <DepositPage setPage={setPage} />;

      case "withdraw":
        return <WithdrawPage setPage={setPage} />;

      case "p2p":
        return (
          <P2PPage
            tab={p2pTab}
            setTab={setP2PTab}
            advertisements={advertisements}
            setPage={setPage}
          />
        );

      case "create-ad":
        return <CreateAdvertisement setPage={setPage} />;

      case "orders":
        return (
          <OrdersPage
            tab={orderTab}
            setTab={setOrderTab}
            orders={orders}
          />
        );

      case "settings":
        return (
          <SettingsPage
            session={session}
            onSignOut={onSignOut}
          />
        );

      case "help":
        return <HelpPage />;

      default:
        return null;
    }
  }

  return (
    <div className="app-shell">
      <header className="top-header">
        <Brand />

        <button
          className="header-signout"
          onClick={onSignOut}
        >
          Sign Out
        </button>
      </header>

      <main className="main-content">
        {renderPage()}
      </main>

      <BottomNavigation
        page={page}
        setPage={setPage}
      />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <Brand />
          <p>Loading Malexa Wallet...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LandingPage />
        <AuthScreen />
      </>
    );
  }

  return (
    <SignedInApp
      session={session}
      onSignOut={handleSignOut}
    />
  );
}
