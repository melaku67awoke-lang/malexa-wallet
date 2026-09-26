import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import AuthScreen from "./components/AuthScreen";
import "./App.css";

type Page =
  | "dashboard"
  | "deposit"
  | "withdraw"
  | "p2p"
  | "orders"
  | "settings"
  | "help";

type P2PTab = "buy" | "sell";
type OrderTab = "active" | "completed" | "cancelled";

type Advertisement = {
  id: number;
  type: P2PTab;
  asset: string;
  currency: string;
  price: string;
  minLimit: string;
  maxLimit: string;
  payment: string;
  owner: string;
};

type Order = {
  id: number;
  adId: number;
  type: P2PTab;
  asset: string;
  currency: string;
  amount: string;
  total: string;
  payment: string;
  status: OrderTab;
};

type DepositAddressResponse = {
  success?: boolean;
  existing?: boolean;
  address?: string;
  network?: string;
  asset?: string;
  asset_id?: string;
  address_required?: boolean;
  message?: string;
  error?: string;
};

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

const initialAds: Advertisement[] = [
  {
    id: 1,
    type: "buy",
    asset: "USDT",
    currency: "USD",
    price: "1.00",
    minLimit: "10",
    maxLimit: "500",
    payment: "Bank Transfer",
    owner: "Malexa User",
  },
  {
    id: 2,
    type: "sell",
    asset: "USDT",
    currency: "USD",
    price: "1.02",
    minLimit: "10",
    maxLimit: "1,000",
    payment: "Bank Transfer",
    owner: "Malexa User",
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

  const [advertisements, setAdvertisements] =
    useState<Advertisement[]>(initialAds);

  const [orders, setOrders] = useState<Order[]>([]);

  const email = session.user.email ?? "Account";

  const navigate = (nextPage: Page) => {
    setPage(nextPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const createAdvertisement = (ad: Advertisement) => {
    setAdvertisements((current) => [ad, ...current]);
  };

  const createOrder = (
    ad: Advertisement,
    amount: string,
  ) => {
    const numericAmount = Number(amount);
    const numericPrice = Number(ad.price);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !Number.isFinite(numericPrice)
    ) {
      return;
    }

    const total = (numericAmount * numericPrice).toFixed(2);

    const newOrder: Order = {
      id: Date.now(),
      adId: ad.id,
      type: ad.type,
      asset: ad.asset,
      currency: ad.currency,
      amount,
      total,
      payment: ad.payment,
      status: "active",
    };

    setOrders((current) => [newOrder, ...current]);

    navigate("orders");
  };

  const cancelOrder = (orderId: number) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "cancelled",
            }
          : order,
      ),
    );
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
              <span className="header-user-label">
                Signed in as
              </span>
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

        {page === "deposit" && <DepositPage />}

        {page === "withdraw" && <WithdrawPage />}

        {page === "p2p" && (
          <P2PPage
            advertisements={advertisements}
            onCreateAdvertisement={createAdvertisement}
            onCreateOrder={createOrder}
          />
        )}

        {page === "orders" && (
          <OrdersPage
            orders={orders}
            onCancelOrder={cancelOrder}
          />
        )}

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
            Manage your balance, P2P activity, orders,
            and account settings.
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
            <span className="balance-label">
              Total Balance
            </span>
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
            <p>Common wallet actions</p>
          </div>
        </div>

        <div className="quick-actions">
          <button
            type="button"
            className="quick-action"
            onClick={() => onNavigate("deposit")}
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
            onClick={() => onNavigate("withdraw")}
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
                View active, completed, and cancelled
                orders.
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
                Manage KYC and payment account.
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
                Get help with your account and
                transactions.
              </small>
            </span>

            <span className="tile-arrow">›</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function DepositPage() {
  const [depositAddress, setDepositAddress] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getDepositAddress = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setCopied(false);

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke(
          "hyper-processor",
          {
            body: {
              action: "get_deposit_address",
            },
          },
        );

      if (functionError) {
        throw new Error(functionError.message);
      }

      const result =
        data as DepositAddressResponse;

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.address) {
        setDepositAddress(result.address);

        setMessage(
          "Your unique BEP-20 USDT deposit address is ready.",
        );

        return;
      }

      if (result.address_required) {
        setMessage(
          result.message ??
            "Your BEP-20 deposit address is not available yet.",
        );

        return;
      }

      throw new Error(
        "The deposit service did not return a deposit address.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to get your deposit address.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    if (!depositAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        depositAddress,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "Unable to copy the address. Please copy it manually.",
      );
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">USDT Deposit</span>

          <h1>Deposit</h1>

          <p>
            Deposit USDT to your Malexa Wallet using
            the BEP-20 network.
          </p>
        </div>
      </div>

      <section className="section-block">
        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">
                Asset
              </span>

              <strong>USDT</strong>
            </div>

            <span className="settings-badge">
              USDT
            </span>
          </div>

          <div className="settings-row">
            <div>
              <span className="settings-label">
                Network
              </span>

              <strong>
                BNB Smart Chain (BEP-20)
              </strong>
            </div>

            <span className="settings-badge">
              BEP-20
            </span>
          </div>

          <div className="settings-row">
            <div>
              <span className="settings-label">
                Deposit method
              </span>

              <strong>
                Personal deposit address
              </strong>
            </div>
          </div>

          {!depositAddress && (
            <div className="settings-row">
              <div style={{ width: "100%" }}>
                <p style={{ margin: 0 }}>
                  Each Malexa Wallet user will receive
                  a unique BEP-20 deposit address.
                </p>
              </div>
            </div>
          )}

          {depositAddress && (
            <div className="settings-row">
              <div style={{ width: "100%" }}>
                <span className="settings-label">
                  Your deposit address
                </span>

                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "10px",
                    background: "#f9fafb",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                    fontSize: "13px",
                  }}
                >
                  {depositAddress}
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={copyAddress}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                  }}
                >
                  {copied
                    ? "Address Copied ✓"
                    : "Copy Address"}
                </button>

                <small
                  style={{
                    display: "block",
                    marginTop: "10px",
                  }}
                >
                  Send only USDT on the BEP-20 network
                  to this address.
                </small>
              </div>
            </div>
          )}

          {message && (
            <div className="settings-row">
              <div style={{ width: "100%" }}>
                <p style={{ margin: 0 }}>
                  {message}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="settings-row">
              <div style={{ width: "100%" }}>
                <p style={{ margin: 0 }}>
                  {error}
                </p>
              </div>
            </div>
          )}

          <div
            className="settings-row"
            style={{
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={getDepositAddress}
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? "Getting Address..."
                : depositAddress
                  ? "Refresh Address"
                  : "Get Deposit Address"}
            </button>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="empty-state">
          <div className="empty-state-icon">!</div>

          <h3>Important</h3>

          <p>
            Only send USDT using the BEP-20 network.
            Sending another asset or using another
            network may result in permanent loss of funds.
          </p>
        </div>
      </section>
    </div>
  );
}

function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Wallet</span>
          <h1>Withdraw</h1>
          <p>
            Withdraw available funds from your Malexa
            Wallet.
          </p>
        </div>
      </div>

      <section className="section-block">
        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">
                Available balance
              </span>
              <strong>$0.00</strong>
            </div>
          </div>

          <div className="settings-row">
            <div style={{ width: "100%" }}>
              <span className="settings-label">
                Withdrawal amount
              </span>

              <input
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
                inputMode="decimal"
                placeholder="Enter withdrawal amount"
                style={{
                  width: "100%",
                  minHeight: "45px",
                  marginTop: "7px",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div className="settings-row">
            <div>
              <span className="settings-label">
                Payment account
              </span>
              <strong>Not configured</strong>
            </div>

            <span className="settings-badge">
              Required
            </span>
          </div>

          <div
            className="settings-row"
            style={{
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (Number(amount) > 0) {
                  setSubmitted(true);
                }
              }}
            >
              Continue Withdrawal
            </button>
          </div>
        </div>
      </section>

      {submitted && (
        <section className="section-block">
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>

            <h3>Withdrawal request created</h3>

            <p>
              Your withdrawal request for ${amount} has
              been recorded. Balance verification and
              payment processing will be connected to the
              backend next.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function P2PPage({
  advertisements,
  onCreateAdvertisement,
  onCreateOrder,
}: {
  advertisements: Advertisement[];
  onCreateAdvertisement: (ad: Advertisement) => void;
  onCreateOrder: (ad: Advertisement, amount: string) => void;
}) {
  const [tab, setTab] = useState<P2PTab>("buy");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAd, setSelectedAd] =
    useState<Advertisement | null>(null);

  const matchingAds = advertisements.filter(
    (ad) => ad.type === tab,
  );

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Peer to peer</span>

          <h1>P2P Trading</h1>

          <p>
            Buy and sell assets directly with other
            Malexa Wallet users.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => setShowCreate(true)}
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
            <strong>Bank Transfer</strong>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>
              {tab === "buy" ? "Buy USDT" : "Sell USDT"}
            </h2>

            <p>
              {matchingAds.length} advertisement
              {matchingAds.length === 1 ? "" : "s"} available
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "14px",
          }}
        >
          {matchingAds.map((ad) => (
            <div className="settings-card" key={ad.id}>
              <div className="settings-row">
                <div>
                  <span className="settings-label">
                    Price
                  </span>

                  <strong>
                    {ad.currency} {ad.price} / {ad.asset}
                  </strong>
                </div>

                <span className="settings-badge">
                  Online
                </span>
              </div>

              <div className="settings-row">
                <div>
                  <span className="settings-label">
                    Limits
                  </span>

                  <strong>
                    {ad.currency} {ad.minLimit} -{" "}
                    {ad.maxLimit}
                  </strong>
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <span className="settings-label">
                    Payment
                  </span>

                  <strong>{ad.payment}</strong>
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <span className="settings-label">
                    Advertiser
                  </span>

                  <strong>{ad.owner}</strong>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setSelectedAd(ad)}
                >
                  {tab === "buy" ? "Buy" : "Sell"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showCreate && (
        <CreateAdvertisement
          defaultType={tab}
          onClose={() => setShowCreate(false)}
          onCreate={(ad) => {
            onCreateAdvertisement(ad);
            setShowCreate(false);
          }}
        />
      )}

      {selectedAd && (
        <TradeAdvertisement
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
          onTrade={(amount) => {
            onCreateOrder(selectedAd, amount);
            setSelectedAd(null);
          }}
        />
      )}
    </div>
  );
}

function CreateAdvertisement({
  defaultType,
  onClose,
  onCreate,
}: {
  defaultType: P2PTab;
  onClose: () => void;
  onCreate: (ad: Advertisement) => void;
}) {
  const [type, setType] = useState<P2PTab>(defaultType);
  const [price, setPrice] = useState("");
  const [minLimit, setMinLimit] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [payment, setPayment] = useState("Bank Transfer");

  const submit = () => {
    if (!price || !minLimit || !maxLimit) {
      return;
    }

    const ad: Advertisement = {
      id: Date.now(),
      type,
      asset: "USDT",
      currency: "USD",
      price,
      minLimit,
      maxLimit,
      payment,
      owner: "You",
    };

    onCreate(ad);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>Create Advertisement</h2>

        <p>
          Create a P2P advertisement for other users.
        </p>

        <div
          style={{
            display: "grid",
            gap: "10px",
          }}
        >
          <label>Advertisement type</label>

          <div className="tab-bar">
            <button
              type="button"
              className={type === "buy" ? "tab active" : "tab"}
              onClick={() => setType("buy")}
            >
              Buy
            </button>

            <button
              type="button"
              className={type === "sell" ? "tab active" : "tab"}
              onClick={() => setType("sell")}
            >
              Sell
            </button>
          </div>

          <label>Asset</label>
          <input
            value="USDT"
            disabled
            style={{
              minHeight: "45px",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#f3f4f6",
            }}
          />

          <label>Price (USD)</label>
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            placeholder="Example: 1.02"
          />

          <label>Minimum limit</label>
          <input
            value={minLimit}
            onChange={(event) =>
              setMinLimit(event.target.value)
            }
            inputMode="decimal"
            placeholder="Example: 10"
          />

          <label>Maximum limit</label>
          <input
            value={maxLimit}
            onChange={(event) =>
              setMaxLimit(event.target.value)
            }
            inputMode="decimal"
            placeholder="Example: 1000"
          />

          <label>Payment method</label>
          <select
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
            style={{
              minHeight: "45px",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
            }}
          >
            <option>Bank Transfer</option>
            <option>Mobile Money</option>
          </select>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={submit}
              style={{ flex: 1 }}
            >
              Publish Ad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeAdvertisement({
  ad,
  onClose,
  onTrade,
}: {
  ad: Advertisement;
  onClose: () => void;
  onTrade: (amount: string) => void;
}) {
  const [amount, setAmount] = useState("");

  const total = Number(amount) * Number(ad.price);

  const validAmount =
    Number(amount) > 0 &&
    Number(amount) >=
      Number(ad.minLimit) / Number(ad.price) &&
    Number(amount) <=
      Number(ad.maxLimit) / Number(ad.price);

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>
          {ad.type === "buy" ? "Buy USDT" : "Sell USDT"}
        </h2>

        <p>
          Price: {ad.currency} {ad.price} / {ad.asset}
        </p>

        <label>Amount in USDT</label>

        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          placeholder="Enter USDT amount"
        />

        <div
          style={{
            marginTop: "18px",
            padding: "15px",
            borderRadius: "12px",
            background: "#f9fafb",
          }}
        >
          <span className="settings-label">Total</span>

          <strong style={{ fontSize: "20px" }}>
            USD{" "}
            {Number.isFinite(total)
              ? total.toFixed(2)
              : "0.00"}
          </strong>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={!validAmount}
            onClick={() => {
              if (validAmount) {
                onTrade(amount);
              }
            }}
            style={{
              flex: 1,
              opacity: validAmount ? 1 : 0.5,
            }}
          >
            {ad.type === "buy" ? "Buy Now" : "Sell Now"}
          </button>
        </div>

        <p
          style={{
            marginTop: "15px",
            fontSize: "11px",
          }}
        >
          Limit: {ad.minLimit} - {ad.maxLimit} USD
        </p>
      </div>
    </div>
  );
}

function OrdersPage({
  orders,
  onCancelOrder,
}: {
  orders: Order[];
  onCancelOrder: (orderId: number) => void;
}) {
  const [tab, setTab] = useState<OrderTab>("active");

  const visibleOrders = orders.filter(
    (order) => order.status === tab,
  );

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Trading history</span>

          <h1>Orders</h1>

          <p>
            Track your P2P orders from creation to
            completion.
          </p>
        </div>
      </div>

      <div className="tab-bar">
        <button
          type="button"
          className={
            tab === "active" ? "tab active" : "tab"
          }
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
        {visibleOrders.length === 0 ? (
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
                ? "When you buy or sell through P2P, your order will appear here."
                : tab === "completed"
                  ? "Completed P2P orders will appear here."
                  : "Cancelled P2P orders will appear here."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {visibleOrders.map((order) => (
              <div
                className="settings-card"
                key={order.id}
              >
                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Order
                    </span>

                    <strong>#{order.id}</strong>
                  </div>

                  <span className="settings-badge">
                    {order.status}
                  </span>
                </div>

                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Trade
                    </span>

                    <strong>
                      {order.type === "buy"
                        ? "Buy"
                        : "Sell"}{" "}
                      {order.amount} {order.asset}
                    </strong>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Total
                    </span>

                    <strong>
                      {order.currency} {order.total}
                    </strong>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Payment
                    </span>

                    <strong>{order.payment}</strong>
                  </div>

                  {order.status === "active" && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        onCancelOrder(order.id)
                      }
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsPage() {
  const [depositAddress, setDepositAddress] =
    useState<string | null>(null);

  const [addressLoading, setAddressLoading] =
    useState(false);

  const [addressMessage, setAddressMessage] =
    useState<string | null>(null);

  const [addressError, setAddressError] =
    useState<string | null>(null);

  const loadDepositAddress = async () => {
    setAddressLoading(true);
    setAddressMessage(null);
    setAddressError(null);

    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "get-deposit-address",
        {
          body: {},
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      const result =
        data as DepositAddressResponse;

      if (result.address) {
        setDepositAddress(result.address);

        setAddressMessage(
          "Your BEP20 deposit address is ready.",
        );

        return;
      }

      if (result.address_required) {
        setAddressMessage(
          result.message ??
            "A BEP20 deposit address has not been assigned yet.",
        );

        return;
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setAddressMessage(
        "No BEP20 deposit address is available yet.",
      );
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : "Unable to load deposit address.",
      );
    } finally {
      setAddressLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            Account management
          </span>

          <h1>Settings</h1>

          <p>
            Manage your profile, KYC, payment account,
            and deposit settings.
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
              <span className="settings-label">
                Account status
              </span>

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
              Complete verification to use features
              that require identity verification.
            </p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">
                Verification status
              </span>

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
            <h2>USDT Deposit</h2>

            <p>
              Your BEP20 deposit address will be shown
              here once it has been securely assigned.
            </p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div style={{ width: "100%" }}>
              <span className="settings-label">
                Network
              </span>

              <strong>BNB Smart Chain (BEP20)</strong>
            </div>

            <span className="settings-badge">
              USDT
            </span>
          </div>

          {depositAddress ? (
            <div className="settings-row">
              <div
                style={{
                  width: "100%",
                }}
              >
                <span className="settings-label">
                  Deposit address
                </span>

                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "10px",
                    background: "#f9fafb",
                    wordBreak: "break-all",
                    fontFamily: "monospace",
                    fontSize: "13px",
                  }}
                >
                  {depositAddress}
                </div>

                <small
                  style={{
                    display: "block",
                    marginTop: "8px",
                  }}
                >
                  Send only USDT on the BEP20 network to
                  this address.
                </small>
              </div>
            </div>
          ) : null}

          {addressMessage && (
            <div
              className="settings-row"
              style={{
                display: "block",
              }}
            >
              <p
                style={{
                  margin: 0,
                }}
              >
                {addressMessage}
              </p>
            </div>
          )}

          {addressError && (
            <div
              className="settings-row"
              style={{
                display: "block",
              }}
            >
              <p
                style={{
                  margin: 0,
                }}
              >
                {addressError}
              </p>
            </div>
          )}

          <div
            className="settings-row"
            style={{
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={loadDepositAddress}
              disabled={addressLoading}
              style={{
                opacity: addressLoading ? 0.6 : 1,
              }}
            >
              {addressLoading
                ? "Checking..."
                : depositAddress
                  ? "Refresh Address"
                  : "Get Deposit Address"}
            </button>
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
            Choose a category to get help with your
            account.
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
          <span className="bottom-nav-icon">
            {item.icon}
          </span>

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
          Manage your account, trade through P2P, and
          keep your wallet activity in one place.
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
