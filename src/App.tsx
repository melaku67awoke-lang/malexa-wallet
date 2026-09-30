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

const USDT_ASSET_ID =
  "d78cd3f3-5fc1-4b59-8f41-86e617017b74";

type Advertisement = {
  id: string;
  userId: string;
  type: P2PTab;
  asset: string;
  currency: string;
  price: string;
  minLimit: string;
  maxLimit: string;
  availableAmount: string;
  payment: string;
  paymentAccountId: string | null;
  paymentTimeLimitMinutes: number;
  terms: string;
  status: string;
  owner: string;
};

type PaymentAccount = {
  id: string;
  bankId: string | null;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isDefault: boolean;
  isActive: boolean;
};

type Bank = {
  id: string;
  bank_name: string;
  is_active: boolean;
};

type Order = {
  id: string;
  adId: string;
  type: P2PTab;
  asset: string;
  currency: string;
  amount: string;
  total: string;
  payment: string;
  status: OrderTab;
  rawStatus: string;
  paymentReference: string | null;
  buyerId: string;
  sellerId: string;
  buyerPaymentAccountId: string | null;
  sellerPaymentAccountId: string | null;
  createdAt: string;
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

type KycInfo = {
  status: string;
  legalName: string | null;
  idType: string | null;
  idNumber: string | null;
  frontIdUrl: string | null;
  backIdUrl: string | null;
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

/*
 * Directly calls the exact Edge Function URL.
 *
 * This intentionally does NOT use:
 * supabase.functions.invoke(...)
 *
 * The request is explicitly sent to:
 * /functions/v1/get-deposit-address
 */
async function requestDepositAddress(): Promise<DepositAddressResponse> {
  const {
    data: { session: currentSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!currentSession?.access_token) {
    throw new Error(
      "Your login session has expired. Please sign in again.",
    );
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase configuration.");
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/get-deposit-address`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
        Authorization: `Bearer ${currentSession.access_token}`,
      },
      body: JSON.stringify({
        action: "get_deposit_address",
      }),
    },
  );

  const responseText = await response.text();

  let result: DepositAddressResponse;

  try {
    result = JSON.parse(responseText) as DepositAddressResponse;
  } catch {
    throw new Error(
      `Deposit service returned HTTP ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      result.error ??
        result.message ??
        `Deposit service returned HTTP ${response.status}.`,
    );
  }

  return result;
}

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
            session={session}
            onNavigate={navigate}
          />
        )}

        {page === "orders" && (
          <OrdersPage session={session} />
        )}

        {page === "settings" && (
          <SettingsPage session={session} />
        )}

        {page === "help" && <HelpPage session={session} />}
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
      const result = await requestDepositAddress();

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
        result.error ??
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
                <p style={{ margin: 0 }}>{message}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="settings-row">
              <div style={{ width: "100%" }}>
                <p style={{ margin: 0 }}>{error}</p>
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

  const numericAmount = Number(amount);
  const fee = 0.4;

  const receiveAmount =
    numericAmount > 0
      ? Math.max(0, numericAmount - fee)
      : 0;

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

          {numericAmount > 0 && (
            <>
              <div className="settings-row">
                <div>
                  <span className="settings-label">
                    Platform fee
                  </span>

                  <strong>$0.40</strong>
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <span className="settings-label">
                    You receive
                  </span>

                  <strong>
                    ${receiveAmount.toFixed(2)}
                  </strong>
                </div>
              </div>
            </>
          )}

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
                if (numericAmount > 0) {
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
              Your withdrawal preview is ${receiveAmount.toFixed(
                2,
              )} after the fixed $0.40 platform fee.
              Final withdrawal processing will be connected
              to the backend.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function P2PPage({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate: (page: Page) => void;
}) {
  const [tab, setTab] = useState<P2PTab>("buy");

  const [advertisements, setAdvertisements] =
    useState<Advertisement[]>([]);

  const [paymentAccounts, setPaymentAccounts] =
    useState<PaymentAccount[]>([]);

  const [kyc, setKyc] = useState<KycInfo>({
    status: "not_submitted",
    legalName: null,
    idType: null,
    idNumber: null,
    frontIdUrl: null,
    backIdUrl: null,
  });

  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPaymentAccount, setShowPaymentAccount] =
    useState(false);

  const [selectedAd, setSelectedAd] =
    useState<Advertisement | null>(null);

  const [error, setError] = useState<string | null>(null);

  const loadP2PData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        adsResult,
        accountsResult,
        kycResult,
      ] = await Promise.all([
        supabase
          .from("p2p_ads")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("payment_accounts")
          .select(
            "id,bank_id,bank_name,account_number,account_holder_name,is_default,is_active",
          )
          .eq("is_active", true)
          .order("is_default", {
            ascending: false,
          }),

        supabase
          .from("kyc_records")
          .select("status,legal_name,id_type,id_number,front_id_url,back_id_url")
          .eq("user_id", session.user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),
      ]);

      if (adsResult.error) {
        throw adsResult.error;
      }

      if (accountsResult.error) {
        throw accountsResult.error;
      }

      if (kycResult.error) {
        throw kycResult.error;
      }

      const currentKyc: KycInfo = {
        status: kycResult.data?.status ?? "not_submitted",
        legalName: kycResult.data?.legal_name ?? null,
        idType: kycResult.data?.id_type ?? null,
        idNumber: kycResult.data?.id_number ?? null,
        frontIdUrl: kycResult.data?.front_id_url ?? null,
        backIdUrl: kycResult.data?.back_id_url ?? null,
      };

      setKyc(currentKyc);

      setPaymentAccounts(
        (accountsResult.data ?? []).map((account) => ({
          id: account.id,
          bankId: account.bank_id,
          bankName: account.bank_name ?? "Bank Transfer",
          accountNumber: account.account_number,
          accountHolderName:
            account.account_holder_name ?? "",
          isDefault: Boolean(account.is_default),
          isActive: Boolean(account.is_active),
        })),
      );

      const currentUserId = session.user.id;

      setAdvertisements(
        (adsResult.data ?? [])
          .filter(
            (ad) =>
              ad.status === "active" ||
              ad.user_id === currentUserId,
          )
          .map((ad) => ({
            id: ad.id,
            userId: ad.user_id,
            type: ad.side as P2PTab,
            asset: "USDT",
            currency: "USD",
            price: String(ad.price),
            minLimit: String(ad.min_amount),
            maxLimit: String(ad.max_amount),
            availableAmount: String(
              ad.available_amount,
            ),
            payment: "Bank Transfer",
            paymentAccountId:
              ad.payment_account_id ?? null,
            paymentTimeLimitMinutes:
              Number(
                ad.payment_time_limit_minutes,
              ) || 30,
            terms: ad.terms ?? "",
            status: ad.status,
            owner:
              ad.user_id === currentUserId
                ? "You"
                : "Malexa User",
          })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load P2P data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadP2PData();
  }, [session.user.id]);

  const verified =
    kyc.status.trim().toLowerCase() === "approved" &&
    Boolean(kyc.legalName?.trim());

  const matchingAds = advertisements.filter(
    (ad) => ad.type === tab && ad.status === "active",
  );

  const createAdvertisement = async (data: {
    type: P2PTab;
    price: string;
    minLimit: string;
    maxLimit: string;
    availableAmount: string;
    paymentAccountId: string;
    paymentTimeLimitMinutes: number;
    terms: string;
  }) => {
    if (!verified) {
      setError(
        "KYC verification is required before using P2P.",
      );
      return;
    }

    setError(null);

    const price = Number(data.price);
    const minLimit = Number(data.minLimit);
    const maxLimit = Number(data.maxLimit);
    const availableAmount = Number(
      data.availableAmount,
    );

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(minLimit) ||
      minLimit <= 0 ||
      !Number.isFinite(maxLimit) ||
      maxLimit < minLimit ||
      !Number.isFinite(availableAmount) ||
      availableAmount <= 0
    ) {
      setError(
        "Please enter valid advertisement values.",
      );
      return;
    }

    if (!data.paymentAccountId) {
      setError(
        "Please select a verified payment account.",
      );
      return;
    }

    try {
      const { error: rpcError } =
        await supabase.rpc("create_p2p_ad", {
          p_side: data.type,
          p_asset_id: USDT_ASSET_ID,
          p_network: "BEP20",
          p_price: price,
          p_min_amount: minLimit,
          p_max_amount: maxLimit,
          p_available_amount: availableAmount,
          p_payment_account_id:
            data.paymentAccountId,
          p_payment_time_limit_minutes:
            data.paymentTimeLimitMinutes,
          p_terms: data.terms.trim() || null,
        });

      if (rpcError) {
        throw rpcError;
      }

      setShowCreate(false);
      await loadP2PData();
    } catch (createError) {
      const rpcError = createError as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };

      const parts = [
        rpcError.message,
        rpcError.details,
        rpcError.hint,
        rpcError.code
          ? `Code: ${rpcError.code}`
          : null,
      ].filter(Boolean);

      setError(
        parts.length > 0
          ? `Unable to create advertisement: ${parts.join(" | ")}`
          : "Unable to create advertisement.",
      );
    }
  };

  const createOrder = async (
    ad: Advertisement,
    amount: string,
    paymentAccountId: string,
  ) => {
    if (!verified) {
      setError(
        "KYC verification is required before using P2P.",
      );
      return;
    }

    if (!paymentAccountId) {
      setError(
        "Please select a payment account.",
      );
      return;
    }

    setError(null);

    try {
      const { error: rpcError } =
        await supabase.rpc("create_p2p_order", {
          p_ad_id: ad.id,
          p_amount: Number(amount),
          p_payment_account_id:
            paymentAccountId,
        });

      if (rpcError) {
        throw rpcError;
      }

      setSelectedAd(null);
      await loadP2PData();
      onNavigate("orders");
    } catch (orderError) {
      setError(
        orderError instanceof Error
          ? orderError.message
          : "Unable to create P2P order.",
      );
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Peer to peer</span>

          <h1>P2P Trading</h1>

          <p>
            Buy and sell USDT directly with other
            Malexa Wallet users.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            if (!verified) {
              setError(
                "Complete KYC verification before creating or using P2P advertisements.",
              );
              return;
            }

            if (paymentAccounts.length === 0) {
              setError(
                "Add a verified bank payment account before creating a P2P advertisement.",
              );
              setShowPaymentAccount(true);
              return;
            }

            setError(null);
            setShowCreate(true);
          }}
        >
          + Create Advertisement
        </button>
      </div>

      {error && (
        <section className="section-block">
          <div className="empty-state">
            <div className="empty-state-icon">!</div>

            <h3>P2P message</h3>

            <p>{error}</p>
          </div>
        </section>
      )}

      {!verified && (
        <section className="section-block">
          <div className="empty-state">
            <div className="empty-state-icon">!</div>

            <h3>KYC verification required</h3>

            <p>
              Your account must have verified KYC before
              you can create advertisements or place P2P
              orders.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate("settings")}
            >
              Open Settings
            </button>
          </div>
        </section>
      )}

      {verified && paymentAccounts.length === 0 && (
        <section className="section-block">
          <div className="empty-state">
            <div className="empty-state-icon">!</div>

            <h3>Payment account required</h3>

            <p>
              Add your Ethiopian bank account in Settings
              before using P2P.
            </p>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowPaymentAccount(true)}
            >
              Add Bank Account
            </button>
          </div>
        </section>
      )}

      <div className="tab-bar">
        <button
          type="button"
          className={
            tab === "buy" ? "tab active" : "tab"
          }
          onClick={() => setTab("buy")}
        >
          Buy
        </button>

        <button
          type="button"
          className={
            tab === "sell" ? "tab active" : "tab"
          }
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
              {tab === "buy"
                ? "Buy USDT"
                : "Sell USDT"}
            </h2>

            <p>
              {loading
                ? "Loading advertisements..."
                : `${matchingAds.length} advertisement${
                    matchingAds.length === 1
                      ? ""
                      : "s"
                  } available`}
            </p>
          </div>
        </div>

        {matchingAds.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              ⇄
            </div>

            <h3>No advertisements available</h3>

            <p>
              There are currently no active{" "}
              {tab === "buy" ? "buy" : "sell"}{" "}
              advertisements.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {matchingAds.map((ad) => (
              <div
                className="settings-card"
                key={ad.id}
              >
                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Price
                    </span>

                    <strong>
                      {ad.currency} {ad.price} /{" "}
                      {ad.asset}
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
                      {ad.currency}{" "}
                      {ad.minLimit} -{" "}
                      {ad.maxLimit}
                    </strong>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Available
                    </span>

                    <strong>
                      {ad.availableAmount} USDT
                    </strong>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Payment
                    </span>

                    <strong>
                      {ad.payment}
                    </strong>
                  </div>
                </div>

                <div className="settings-row">
                  <div>
                    <span className="settings-label">
                      Advertiser
                    </span>

                    <strong>{ad.owner}</strong>
                  </div>

                  {ad.userId === session.user.id ? (
                    <span className="settings-badge">
                      Your Ad
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => {
                        if (!verified) {
                          setError(
                            "KYC verification is required before using P2P.",
                          );
                          return;
                        }

                        if (
                          paymentAccounts.length === 0
                        ) {
                          setError(
                            "Add a bank payment account before placing a P2P order.",
                          );
                          setShowPaymentAccount(true);
                          return;
                        }

                        setSelectedAd(ad);
                      }}
                    >
                      {tab === "buy"
                        ? "Buy"
                        : "Sell"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateAdvertisement
          defaultType={tab}
          paymentAccounts={paymentAccounts}
          onClose={() => setShowCreate(false)}
          onCreate={createAdvertisement}
        />
      )}

      {selectedAd && (
        <TradeAdvertisement
          ad={selectedAd}
          paymentAccounts={paymentAccounts}
          onClose={() => setSelectedAd(null)}
          onTrade={createOrder}
        />
      )}

      {showPaymentAccount && (
        <PaymentAccountModal
          kyc={kyc}
          onClose={() =>
            setShowPaymentAccount(false)
          }
          onSaved={async () => {
            setShowPaymentAccount(false);
            await loadP2PData();
          }}
        />
      )}
    </div>
  );
}

function CreateAdvertisement({
  defaultType,
  paymentAccounts,
  onClose,
  onCreate,
}: {
  defaultType: P2PTab;
  paymentAccounts: PaymentAccount[];
  onClose: () => void;
  onCreate: (data: {
    type: P2PTab;
    price: string;
    minLimit: string;
    maxLimit: string;
    availableAmount: string;
    paymentAccountId: string;
    paymentTimeLimitMinutes: number;
    terms: string;
  }) => Promise<void>;
}) {
  const [type, setType] =
    useState<P2PTab>(defaultType);

  const [price, setPrice] = useState("");
  const [minLimit, setMinLimit] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [availableAmount, setAvailableAmount] =
    useState("");

  const [paymentAccountId, setPaymentAccountId] =
    useState(
      paymentAccounts.find(
        (account) => account.isDefault,
      )?.id ??
        paymentAccounts[0]?.id ??
        "",
    );

  const [paymentTimeLimit, setPaymentTimeLimit] =
    useState("30");

  const [terms, setTerms] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (
      !price ||
      !minLimit ||
      !maxLimit ||
      !availableAmount ||
      !paymentAccountId
    ) {
      return;
    }

    setSaving(true);

    try {
      await onCreate({
        type,
        price,
        minLimit,
        maxLimit,
        availableAmount,
        paymentAccountId,
        paymentTimeLimitMinutes:
          Number(paymentTimeLimit) || 30,
        terms,
      });
    } finally {
      setSaving(false);
    }
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
              className={
                type === "buy"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => setType("buy")}
            >
              Buy
            </button>

            <button
              type="button"
              className={
                type === "sell"
                  ? "tab active"
                  : "tab"
              }
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

          <label>Network</label>

          <input
            value="BEP-20"
            disabled
            style={{
              minHeight: "45px",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#f3f4f6",
            }}
          />

          <label>Price (USD per USDT)</label>

          <input
            value={price}
            onChange={(event) =>
              setPrice(event.target.value)
            }
            inputMode="decimal"
            placeholder="Example: 1.02"
          />

          <label>Minimum USDT</label>

          <input
            value={minLimit}
            onChange={(event) =>
              setMinLimit(event.target.value)
            }
            inputMode="decimal"
            placeholder="Example: 10"
          />

          <label>Maximum USDT</label>

          <input
            value={maxLimit}
            onChange={(event) =>
              setMaxLimit(event.target.value)
            }
            inputMode="decimal"
            placeholder="Example: 1000"
          />

          <label>Total available USDT</label>

          <input
            value={availableAmount}
            onChange={(event) =>
              setAvailableAmount(
                event.target.value,
              )
            }
            inputMode="decimal"
            placeholder="Example: 500"
          />

          <label>Payment account</label>

          <select
            value={paymentAccountId}
            onChange={(event) =>
              setPaymentAccountId(
                event.target.value,
              )
            }
            style={{
              minHeight: "45px",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
            }}
          >
            <option value="">
              Select bank account
            </option>

            {paymentAccounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
              >
                {account.bankName} —{" "}
                {account.accountNumber}
              </option>
            ))}
          </select>

          <label>Payment time limit</label>

          <select
            value={paymentTimeLimit}
            onChange={(event) =>
              setPaymentTimeLimit(
                event.target.value,
              )
            }
            style={{
              minHeight: "45px",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
            }}
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>

          <label>Terms (optional)</label>

          <textarea
            value={terms}
            onChange={(event) =>
              setTerms(event.target.value)
            }
            placeholder="Optional trading terms"
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              resize: "vertical",
            }}
          />

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
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => void submit()}
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving
                ? "Publishing..."
                : "Publish Ad"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeAdvertisement({
  ad,
  paymentAccounts,
  onClose,
  onTrade,
}: {
  ad: Advertisement;
  paymentAccounts: PaymentAccount[];
  onClose: () => void;
  onTrade: (
    ad: Advertisement,
    amount: string,
    paymentAccountId: string,
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");

  const [paymentAccountId, setPaymentAccountId] =
    useState(
      paymentAccounts.find(
        (account) => account.isDefault,
      )?.id ??
        paymentAccounts[0]?.id ??
        "",
    );

  const [saving, setSaving] = useState(false);

  const numericAmount = Number(amount);
  const numericPrice = Number(ad.price);

  const total =
    numericAmount * numericPrice;

  const minAmount =
    Number(ad.minLimit) / numericPrice;

  const maxAmount =
    Math.min(
      Number(ad.maxLimit) / numericPrice,
      Number(ad.availableAmount),
    );

  const validAmount =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    Number.isFinite(numericPrice) &&
    numericPrice > 0 &&
    numericAmount >= minAmount &&
    numericAmount <= maxAmount &&
    Boolean(paymentAccountId);

  const submit = async () => {
    if (!validAmount) {
      return;
    }

    setSaving(true);

    try {
      await onTrade(
        ad,
        amount,
        paymentAccountId,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>
          {ad.type === "buy"
            ? "Buy USDT"
            : "Sell USDT"}
        </h2>

        <p>
          Price: {ad.currency} {ad.price} /{" "}
          {ad.asset}
        </p>

        <p>
          Available: {ad.availableAmount} USDT
        </p>

        <label>Amount in USDT</label>

        <input
          value={amount}
          onChange={(event) =>
            setAmount(event.target.value)
          }
          inputMode="decimal"
          placeholder="Enter USDT amount"
        />

        <label
          style={{
            display: "block",
            marginTop: "15px",
          }}
        >
          Your payment account
        </label>

        <select
          value={paymentAccountId}
          onChange={(event) =>
            setPaymentAccountId(
              event.target.value,
            )
          }
          style={{
            width: "100%",
            minHeight: "45px",
            marginTop: "7px",
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            background: "#ffffff",
          }}
        >
          <option value="">
            Select bank account
          </option>

          {paymentAccounts.map((account) => (
            <option
              key={account.id}
              value={account.id}
            >
              {account.bankName} —{" "}
              {account.accountNumber}
            </option>
          ))}
        </select>

        <div
          style={{
            marginTop: "18px",
            padding: "15px",
            borderRadius: "12px",
            background: "#f9fafb",
          }}
        >
          <span className="settings-label">
            Total
          </span>

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
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={!validAmount || saving}
            onClick={() => void submit()}
            style={{
              flex: 1,
              opacity:
                validAmount && !saving ? 1 : 0.5,
            }}
          >
            {saving
              ? "Creating..."
              : ad.type === "buy"
                ? "Buy Now"
                : "Sell Now"}
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
  session,
}: {
  session: Session;
}) {
  const [tab, setTab] =
    useState<OrderTab>("active");

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [workingOrderId, setWorkingOrderId] =
    useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: orderError } =
        await supabase
          .from("p2p_orders")
          .select("*")
          .or(
            `buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`,
          )
          .order("created_at", {
            ascending: false,
          });

      if (orderError) {
        throw orderError;
      }

      const orderRows = data ?? [];

      const adIds = Array.from(
        new Set(
          orderRows.map(
            (order) => order.ad_id,
          ),
        ),
      );

      let adMap = new Map<
        string,
        Advertisement
      >();

      if (adIds.length > 0) {
        const { data: ads, error: adsError } =
          await supabase
            .from("p2p_ads")
            .select("*")
            .in("id", adIds);

        if (adsError) {
          throw adsError;
        }

        adMap = new Map(
          (ads ?? []).map((ad) => [
            ad.id,
            {
              id: ad.id,
              userId: ad.user_id,
              type: ad.side as P2PTab,
              asset: "USDT",
              currency: "USD",
              price: String(ad.price),
              minLimit: String(
                ad.min_amount,
              ),
              maxLimit: String(
                ad.max_amount,
              ),
              availableAmount: String(
                ad.available_amount,
              ),
              payment: "Bank Transfer",
              paymentAccountId:
                ad.payment_account_id ??
                null,
              paymentTimeLimitMinutes:
                Number(
                  ad.payment_time_limit_minutes,
                ) || 30,
              terms: ad.terms ?? "",
              status: ad.status,
              owner: "Malexa User",
            },
          ]),
        );
      }

      const mappedOrders: Order[] =
        orderRows.map((order) => {
          const ad = adMap.get(
            order.ad_id,
          );

          const rawStatus =
            String(order.status);

          let status: OrderTab =
            "active";

          if (rawStatus === "completed") {
            status = "completed";
          } else if (
            rawStatus === "cancelled"
          ) {
            status = "cancelled";
          }

          return {
            id: order.id,
            adId: order.ad_id,
            type:
              ad?.type ??
              "buy",
            asset: "USDT",
            currency: "USD",
            amount: String(order.amount),
            total: String(
              order.fiat_amount,
            ),
            payment:
              "Bank Transfer",
            status,
            rawStatus,
            paymentReference:
              order.payment_reference ??
              null,
            buyerId:
              order.buyer_id,
            sellerId:
              order.seller_id,
            buyerPaymentAccountId:
              order.buyer_payment_account_id ??
              null,
            sellerPaymentAccountId:
              order.seller_payment_account_id ??
              null,
            createdAt:
              order.created_at,
          };
        });

      setOrders(mappedOrders);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load orders.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [session.user.id]);

  const runOrderAction = async (
    orderId: string,
    action:
      | "paid"
      | "release"
      | "cancel",
  ) => {
    setWorkingOrderId(orderId);
    setError(null);

    try {
      if (action === "paid") {
        const reference = window.prompt(
          "Enter your payment reference (optional):",
        );

        const { error: rpcError } =
          await supabase.rpc(
            "mark_p2p_order_paid",
            {
              p_order_id: orderId,
              p_payment_reference:
                reference?.trim() || null,
            },
          );

        if (rpcError) {
          throw rpcError;
        }
      }

      if (action === "release") {
        const { error: rpcError } =
          await supabase.rpc(
            "release_p2p_order",
            {
              p_order_id: orderId,
            },
          );

        if (rpcError) {
          throw rpcError;
        }
      }

      if (action === "cancel") {
        const reason = window.prompt(
          "Cancellation reason:",
          "Cancelled by user",
        );

        const { error: rpcError } =
          await supabase.rpc(
            "cancel_p2p_order",
            {
              p_order_id: orderId,
              p_reason:
                reason?.trim() ||
                "Cancelled by user",
            },
          );

        if (rpcError) {
          throw rpcError;
        }
      }

      await loadOrders();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update the order.",
      );
    } finally {
      setWorkingOrderId(null);
    }
  };

  const visibleOrders = orders.filter(
    (order) => order.status === tab,
  );

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            Trading history
          </span>

          <h1>Orders</h1>

          <p>
            Track your P2P orders from creation to
            completion.
          </p>
        </div>
      </div>

      {error && (
        <section className="section-block">
          <div className="empty-state">
            <div className="empty-state-icon">
              !
            </div>

            <h3>Order message</h3>

            <p>{error}</p>
          </div>
        </section>
      )}

      <div className="tab-bar">
        <button
          type="button"
          className={
            tab === "active"
              ? "tab active"
              : "tab"
          }
          onClick={() => setTab("active")}
        >
          Active
        </button>

        <button
          type="button"
          className={
            tab === "completed"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            setTab("completed")
          }
        >
          Completed
        </button>

        <button
          type="button"
          className={
            tab === "cancelled"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            setTab("cancelled")
          }
        >
          Cancelled
        </button>
      </div>

      <section className="section-block">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              …
            </div>

            <h3>Loading orders</h3>

            <p>
              Loading your P2P orders...
            </p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              ▤
            </div>

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
            {visibleOrders.map((order) => {
              const isBuyer =
                order.buyerId ===
                session.user.id;

              const isSeller =
                order.sellerId ===
                session.user.id;

              const working =
                workingOrderId ===
                order.id;

              return (
                <div
                  className="settings-card"
                  key={order.id}
                >
                  <div className="settings-row">
                    <div>
                      <span className="settings-label">
                        Order
                      </span>

                      <strong>
                        #{order.id}
                      </strong>
                    </div>

                    <span className="settings-badge">
                      {order.rawStatus}
                    </span>
                  </div>

                  <div className="settings-row">
                    <div>
                      <span className="settings-label">
                        Trade
                      </span>

                      <strong>
                        {order.type ===
                        "buy"
                          ? "Buy"
                          : "Sell"}{" "}
                        {order.amount}{" "}
                        {order.asset}
                      </strong>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div>
                      <span className="settings-label">
                        Total
                      </span>

                      <strong>
                        {order.currency}{" "}
                        {Number(
                          order.total,
                        ).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div>
                      <span className="settings-label">
                        Payment
                      </span>

                      <strong>
                        {order.payment}
                      </strong>
                    </div>
                  </div>

                  {order.paymentReference && (
                    <div className="settings-row">
                      <div>
                        <span className="settings-label">
                          Payment reference
                        </span>

                        <strong>
                          {
                            order.paymentReference
                          }
                        </strong>
                      </div>
                    </div>
                  )}

                  {order.rawStatus ===
                    "pending_payment" &&
                    isBuyer && (
                      <div
                        className="settings-row"
                        style={{
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="primary-button"
                          disabled={working}
                          onClick={() =>
                            void runOrderAction(
                              order.id,
                              "paid",
                            )
                          }
                        >
                          {working
                            ? "Updating..."
                            : "I Have Paid"}
                        </button>
                      </div>
                    )}

                  {order.rawStatus ===
                    "paid" &&
                    isSeller && (
                      <div
                        className="settings-row"
                        style={{
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="primary-button"
                          disabled={working}
                          onClick={() =>
                            void runOrderAction(
                              order.id,
                              "release",
                            )
                          }
                        >
                          {working
                            ? "Releasing..."
                            : "Release USDT"}
                        </button>
                      </div>
                    )}

                  {[
                    "pending_payment",
                    "paid",
                  ].includes(
                    order.rawStatus,
                  ) && (
                    <div
                      className="settings-row"
                      style={{
                        justifyContent:
                          "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={working}
                        onClick={() =>
                          void runOrderAction(
                            order.id,
                            "cancel",
                          )
                        }
                      >
                        {working
                          ? "Cancelling..."
                          : "Cancel Order"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsPage({
  session,
}: {
  session: Session;
}) {
  const [depositAddress, setDepositAddress] =
    useState<string | null>(null);

  const [addressLoading, setAddressLoading] =
    useState(false);

  const [addressMessage, setAddressMessage] =
    useState<string | null>(null);

  const [addressError, setAddressError] =
    useState<string | null>(null);

  const [kyc, setKyc] = useState<KycInfo>({
    status: "not_submitted",
    legalName: null,
    idType: null,
    idNumber: null,
    frontIdUrl: null,
    backIdUrl: null,
  });

  const [paymentAccounts, setPaymentAccounts] =
    useState<PaymentAccount[]>([]);

  const [loadingAccounts, setLoadingAccounts] =
    useState(true);

  const [showPaymentAccount, setShowPaymentAccount] =
    useState(false);

  const [showKycMessage, setShowKycMessage] =
    useState(false);

  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycFormError, setKycFormError] = useState<string | null>(null);
  const [kycLegalName, setKycLegalName] = useState("");
  const [kycIdType, setKycIdType] = useState("");
  const [kycIdNumber, setKycIdNumber] = useState("");
  const [kycFrontFile, setKycFrontFile] = useState<File | null>(null);
  const [kycBackFile, setKycBackFile] = useState<File | null>(null);

  const loadSettings = async () => {
    setLoadingAccounts(true);

    try {
      const [
        kycResult,
        accountsResult,
      ] = await Promise.all([
        supabase
          .from("kyc_records")
          .select("status,legal_name,id_type,id_number,front_id_url,back_id_url")
          .eq("user_id", session.user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("payment_accounts")
          .select(
            "id,bank_id,bank_name,account_number,account_holder_name,is_default,is_active",
          )
          .eq("is_active", true)
          .order("is_default", {
            ascending: false,
          }),
      ]);

      if (kycResult.error) {
        throw kycResult.error;
      }

      if (accountsResult.error) {
        throw accountsResult.error;
      }

      setKyc({
        status:
          kycResult.data?.status ??
          "not_submitted",
        legalName:
          kycResult.data?.legal_name ??
          null,
        idType:
          kycResult.data?.id_type ??
          null,
        idNumber:
          kycResult.data?.id_number ??
          null,
        frontIdUrl:
          kycResult.data?.front_id_url ??
          null,
        backIdUrl:
          kycResult.data?.back_id_url ??
          null,
      });

      setPaymentAccounts(
        (accountsResult.data ?? []).map(
          (account) => ({
            id: account.id,
            bankId: account.bank_id,
            bankName:
              account.bank_name ??
              "Bank Transfer",
            accountNumber:
              account.account_number,
            accountHolderName:
              account.account_holder_name ??
              "",
            isDefault: Boolean(
              account.is_default,
            ),
            isActive: Boolean(
              account.is_active,
            ),
          }),
        ),
      );
    } catch {
      setPaymentAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, [session.user.id]);

  const loadDepositAddress = async () => {
    setAddressLoading(true);
    setAddressMessage(null);
    setAddressError(null);

    try {
      const result =
        await requestDepositAddress();

      if (result.address) {
        setDepositAddress(
          result.address,
        );

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
        throw new Error(
          result.error,
        );
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

  const verified =
    kyc.status.toLowerCase() ===
      "verified" &&
    Boolean(
      kyc.legalName?.trim(),
    );

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

            <p>
              Your Malexa Wallet account
            </p>
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
              KYC is required before using P2P.
            </p>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-row">
            <div>
              <span className="settings-label">
                Verification status
              </span>

              <strong>
                {formatKycStatus(
                  kyc.status,
                )}
              </strong>
            </div>

            <span className="settings-badge">
              {verified
                ? "Verified"
                : formatKycStatus(
                    kyc.status,
                  )}
            </span>
          </div>

          {verified &&
            kyc.legalName && (
              <div className="settings-row">
                <div>
                  <span className="settings-label">
                    Verified legal name
                  </span>

                  <strong>
                    {kyc.legalName}
                  </strong>
                </div>
              </div>
            )}

          <div className="settings-row">
            <div>
              <p style={{ margin: 0 }}>
                KYC submission and review are
                managed by the Malexa backend.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              disabled={
                kyc.status.toLowerCase() === "pending" ||
                kyc.status.toLowerCase() === "verified"
              }
              onClick={() => {
                setKycFormError(null);
                setKycLegalName(kyc.legalName ?? "");
                setKycIdType(kyc.idType ?? "");
                setKycIdNumber(kyc.idNumber ?? "");
                setKycFrontFile(null);
                setKycBackFile(null);
                setShowKycMessage(true);
              }}
            >
              {kyc.status.toLowerCase() === "pending"
                ? "Under Review"
                : kyc.status.toLowerCase() === "verified"
                  ? "Verified"
                  : kyc.status.toLowerCase() === "rejected"
                    ? "Resubmit KYC"
                    : "Open KYC"}
            </button>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>Payment Account</h2>

            <p>
              Bank accounts are used for P2P
              transactions only.
            </p>
          </div>
        </div>

        {loadingAccounts ? (
          <div className="settings-card">
            <div className="settings-row">
              <div>
                <strong>
                  Loading payment accounts...
                </strong>
              </div>
            </div>
          </div>
        ) : paymentAccounts.length === 0 ? (
          <div className="settings-card">
            <div className="settings-row">
              <div>
                <span className="settings-label">
                  Saved payment account
                </span>

                <strong>
                  Not configured
                </strong>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowPaymentAccount(
                    true,
                  )
                }
              >
                Add Account
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {paymentAccounts.map(
              (account) => (
                <div
                  className="settings-card"
                  key={account.id}
                >
                  <div className="settings-row">
                    <div>
                      <span className="settings-label">
                        Bank
                      </span>

                      <strong>
                        {account.bankName}
                      </strong>
                    </div>

                    {account.isDefault && (
                      <span className="settings-badge">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="settings-row">
                    <div>
                      <span className="settings-label">
                        Account number
                      </span>

                      <strong>
                        {
                          account.accountNumber
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div>
                      <span className="settings-label">
                        Account holder
                      </span>

                      <strong>
                        {
                          account.accountHolderName
                        }
                      </strong>

                      <small
                        style={{
                          display:
                            "block",
                          marginTop:
                            "5px",
                        }}
                      >
                        Taken from your
                        verified KYC legal
                        name.
                      </small>
                    </div>
                  </div>

                  <div
                    className="settings-row"
                    style={{
                      justifyContent:
                        "flex-end",
                    }}
                  >
                    {!account.isDefault && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={async () => {
                          const {
                            error,
                          } =
                            await supabase.rpc(
                              "set_default_payment_account",
                              {
                                p_account_id:
                                  account.id,
                              },
                            );

                          if (error) {
                            window.alert(
                              error.message,
                            );
                            return;
                          }

                          await loadSettings();
                        }}
                      >
                        Make Default
                      </button>
                    )}

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        window.alert(
                          "To change the account, use Add Account and choose the updated bank account.",
                        )
                      }
                    >
                      Add Another
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={async () => {
                        const confirmed =
                          window.confirm(
                            "Delete this payment account?",
                          );

                        if (
                          !confirmed
                        ) {
                          return;
                        }

                        const {
                          error,
                        } =
                          await supabase.rpc(
                            "delete_payment_account",
                            {
                              p_account_id:
                                account.id,
                            },
                          );

                        if (error) {
                          window.alert(
                            error.message,
                          );
                          return;
                        }

                        await loadSettings();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ),
            )}

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setShowPaymentAccount(
                  true,
                )
              }
            >
              + Add Bank Account
            </button>
          </div>
        )}
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

              <strong>
                BNB Smart Chain (BEP20)
              </strong>
            </div>

            <span className="settings-badge">
              USDT
            </span>
          </div>

          {depositAddress && (
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
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      "10px",
                    background:
                      "#f9fafb",
                    wordBreak:
                      "break-all",
                    fontFamily:
                      "monospace",
                    fontSize:
                      "13px",
                  }}
                >
                  {depositAddress}
                </div>

                <small
                  style={{
                    display:
                      "block",
                    marginTop:
                      "8px",
                  }}
                >
                  Send only USDT on the
                  BEP20 network to this
                  address.
                </small>
              </div>
            </div>
          )}

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
              justifyContent:
                "flex-end",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={
                loadDepositAddress
              }
              disabled={
                addressLoading
              }
              style={{
                opacity:
                  addressLoading
                    ? 0.6
                    : 1,
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

      {showPaymentAccount && (
        <PaymentAccountModal
          kyc={kyc}
          onClose={() =>
            setShowPaymentAccount(
              false,
            )
          }
          onSaved={async () => {
            setShowPaymentAccount(
              false,
            );

            await loadSettings();
          }}
        />
      )}

      {showKycMessage && (
        <KycSubmissionModal
          session={session}
          legalName={kycLegalName}
          setLegalName={setKycLegalName}
          idType={kycIdType}
          setIdType={setKycIdType}
          idNumber={kycIdNumber}
          setIdNumber={setKycIdNumber}
          frontFile={kycFrontFile}
          setFrontFile={setKycFrontFile}
          backFile={kycBackFile}
          setBackFile={setKycBackFile}
          submitting={kycSubmitting}
          error={kycFormError}
          onClose={() => {
            if (!kycSubmitting) setShowKycMessage(false);
          }}
          onSubmitting={setKycSubmitting}
          onError={setKycFormError}
          onSubmitted={async () => {
            setShowKycMessage(false);
            await loadSettings();
          }}
        />
      )}
    </div>
  );
}

function KycSubmissionModal({
  session,
  legalName,
  setLegalName,
  idType,
  setIdType,
  idNumber,
  setIdNumber,
  frontFile,
  setFrontFile,
  backFile,
  setBackFile,
  submitting,
  error,
  onClose,
  onSubmitting,
  onError,
  onSubmitted,
}: {
  session: Session;
  legalName: string;
  setLegalName: (value: string) => void;
  idType: string;
  setIdType: (value: string) => void;
  idNumber: string;
  setIdNumber: (value: string) => void;
  frontFile: File | null;
  setFrontFile: (file: File | null) => void;
  backFile: File | null;
  setBackFile: (file: File | null) => void;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmitting: (value: boolean) => void;
  onError: (value: string | null) => void;
  onSubmitted: () => Promise<void>;
}) {
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!frontFile) { setFrontPreview(null); return; }
    const url = URL.createObjectURL(frontFile);
    setFrontPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) { setBackPreview(null); return; }
    const url = URL.createObjectURL(backFile);
    setBackPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [backFile]);

  const chooseImage = (file: File | undefined, setter: (file: File | null) => void) => {
    onError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Please select an ID image from your phone gallery.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Each ID image must be 5 MB or smaller.");
      return;
    }
    setter(file);
  };

  const submit = async () => {
    if (!legalName.trim() || !idType || !idNumber.trim()) {
      onError("Please enter your legal name, select an ID type, and enter your ID number.");
      return;
    }
    if (!frontFile || !backFile) {
      onError("Please select both the front and back of your ID.");
      return;
    }

    onSubmitting(true);
    onError(null);

    try {
      const frontPath = `${session.user.id}/${crypto.randomUUID()}-front-${frontFile.name}`;
      const backPath = `${session.user.id}/${crypto.randomUUID()}-back-${backFile.name}`;

      const front = await supabase.storage.from("kyc-documents").upload(frontPath, frontFile, {
        cacheControl: "3600", upsert: false, contentType: frontFile.type,
      });
      if (front.error) throw front.error;

      const back = await supabase.storage.from("kyc-documents").upload(backPath, backFile, {
        cacheControl: "3600", upsert: false, contentType: backFile.type,
      });
      if (back.error) {
        await supabase.storage.from("kyc-documents").remove([frontPath]);
        throw back.error;
      }

      const existing = await supabase.from("kyc_records")
        .select("id,status")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data?.status?.toLowerCase() === "verified") throw new Error("Your KYC is already verified.");
      if (existing.data?.status?.toLowerCase() === "pending") throw new Error("Your KYC is already under review.");

      const values = {
        user_id: session.user.id,
        legal_name: legalName.trim(),
        id_type: idType,
        id_number: idNumber.trim(),
        front_id_url: frontPath,
        back_id_url: backPath,
        status: "pending",
      };

      const result = existing.data?.id
        ? await supabase.from("kyc_records").update(values).eq("id", existing.data.id).eq("user_id", session.user.id)
        : await supabase.from("kyc_records").insert(values);
      if (result.error) {
        await supabase.storage.from("kyc-documents").remove([frontPath, backPath]);
        throw result.error;
      }

      await onSubmitted();
    } catch (submitError) {
      onError(submitError instanceof Error ? submitError.message : "Unable to submit KYC.");
    } finally {
      onSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card" style={{ maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>
        <h2>KYC Identity Verification</h2>
        <p>Select your ID type and upload both sides of your ID from your phone gallery.</p>

        <label style={{ display: "block", marginBottom: "12px" }}>
          <span className="settings-label">Full Legal Name</span>
          <input className="auth-input" value={legalName} onChange={e => setLegalName(e.target.value)} disabled={submitting} placeholder="Full legal name" />
        </label>

        <label style={{ display: "block", marginBottom: "12px" }}>
          <span className="settings-label">ID Type</span>
          <select className="auth-input" value={idType} onChange={e => setIdType(e.target.value)} disabled={submitting}>
            <option value="">Select ID type</option>
            <option value="National ID">National ID</option>
            <option value="Passport">Passport</option>
            <option value="Driver's License">Driver's License</option>
            <option value="Other Government ID">Other Government ID</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: "16px" }}>
          <span className="settings-label">ID Number</span>
          <input className="auth-input" value={idNumber} onChange={e => setIdNumber(e.target.value)} disabled={submitting} placeholder="ID number" />
        </label>

        <label className="secondary-button" style={{ display: "block", cursor: "pointer", marginBottom: "10px" }}>
          <strong>Front of ID</strong><span style={{ display: "block", marginTop: "5px" }}>{frontFile ? frontFile.name : "Select from phone gallery"}</span>
          <input type="file" accept="image/*" hidden disabled={submitting} onChange={e => { chooseImage(e.target.files?.[0], setFrontFile); e.currentTarget.value = ""; }} />
        </label>
        {frontPreview && <img src={frontPreview} alt="Front of ID preview" style={{ width: "100%", maxHeight: "220px", objectFit: "contain", borderRadius: "10px", marginBottom: "12px" }} />}

        <label className="secondary-button" style={{ display: "block", cursor: "pointer", marginBottom: "10px" }}>
          <strong>Back of ID</strong><span style={{ display: "block", marginTop: "5px" }}>{backFile ? backFile.name : "Select from phone gallery"}</span>
          <input type="file" accept="image/*" hidden disabled={submitting} onChange={e => { chooseImage(e.target.files?.[0], setBackFile); e.currentTarget.value = ""; }} />
        </label>
        {backPreview && <img src={backPreview} alt="Back of ID preview" style={{ width: "100%", maxHeight: "220px", objectFit: "contain", borderRadius: "10px" }} />}

        {error && <p style={{ marginTop: "12px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" className="primary-button" onClick={() => void submit()} disabled={submitting}>{submitting ? "Submitting..." : "Submit KYC"}</button>
        </div>
      </div>
    </div>
  );
}

function PaymentAccountModal({
  kyc,
  onClose,
  onSaved,
}: {
  kyc: KycInfo;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [banks, setBanks] =
    useState<Bank[]>([]);

  const [bankId, setBankId] =
    useState("");

  const [accountNumber, setAccountNumber] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const verified =
    kyc.status.toLowerCase() ===
      "verified" &&
    Boolean(
      kyc.legalName?.trim(),
    );

  useEffect(() => {
    const loadBanks = async () => {
      setLoading(true);
      setError(null);

      const { data, error: bankError } =
        await supabase
          .from("p2p_banks")
          .select(
            "id,bank_name,is_active",
          )
          .eq("is_active", true)
          .order("bank_name", {
            ascending: true,
          });

      if (bankError) {
        setError(
          bankError.message,
        );
        setLoading(false);
        return;
      }

      setBanks(
        (data ?? []) as Bank[],
      );

      setLoading(false);
    };

    void loadBanks();
  }, []);

  const save = async () => {
    if (!verified) {
      setError(
        "Verified KYC is required before adding a payment account.",
      );
      return;
    }

    if (!bankId) {
      setError(
        "Please select your bank.",
      );
      return;
    }

    if (!accountNumber.trim()) {
      setError(
        "Please enter your bank account number.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: rpcError } =
        await supabase.rpc(
          "create_payment_account",
          {
            p_bank_id: bankId,
            p_account_number:
              accountNumber.trim(),
          },
        );

      if (rpcError) {
        throw rpcError;
      }

      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save payment account.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>Add Bank Account</h2>

        <p>
          This account will be used for P2P
          transactions only.
        </p>

        <div
          style={{
            display: "grid",
            gap: "10px",
          }}
        >
          <label>Account holder name</label>

          <input
            value={
              kyc.legalName ??
              "KYC verification required"
            }
            disabled
            style={{
              minHeight: "45px",
              padding: "10px 12px",
              border:
                "1px solid #d1d5db",
              borderRadius:
                "10px",
              background:
                "#f3f4f6",
            }}
          />

          <small>
            The account holder name comes from
            your verified KYC legal name. You
            cannot edit it here.
          </small>

          <label>Bank</label>

          <select
            value={bankId}
            onChange={(event) =>
              setBankId(
                event.target.value,
              )
            }
            disabled={loading}
            style={{
              minHeight: "45px",
              padding: "10px 12px",
              border:
                "1px solid #d1d5db",
              borderRadius:
                "10px",
              background:
                "#ffffff",
            }}
          >
            <option value="">
              {loading
                ? "Loading banks..."
                : "Select your bank"}
            </option>

            {banks.map((bank) => (
              <option
                key={bank.id}
                value={bank.id}
              >
                {bank.bank_name}
              </option>
            ))}
          </select>

          <label>
            Bank account number
          </label>

          <input
            value={accountNumber}
            onChange={(event) =>
              setAccountNumber(
                event.target.value,
              )
            }
            inputMode="numeric"
            placeholder="Enter account number"
          />

          {error && (
            <div
              style={{
                padding:
                  "10px 12px",
                borderRadius:
                  "10px",
                background:
                  "#fef2f2",
              }}
            >
              <p
                style={{
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}

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
              style={{
                flex: 1,
              }}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                void save()
              }
              style={{
                flex: 1,
              }}
              disabled={
                saving ||
                loading ||
                !verified
              }
            >
              {saving
                ? "Saving..."
                : "Save Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpPage({
  session,
}: {
  session: Session;
}) {
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

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const closeForm = () => {
    if (submitting) {
      return;
    }

    setSelectedCategory(null);
    setSubject("");
    setMessage("");
    setError(null);
  };

  const openCategory = (category: string) => {
    setSelectedCategory(category);
    setSubject("");
    setMessage("");
    setError(null);
    setSuccess(null);
  };

  const submitTicket = async () => {
    if (!selectedCategory) {
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject.");
      return;
    }

    if (!message.trim()) {
      setError("Please describe your problem.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: session.user.id,
          category: selectedCategory,
          subject: subject.trim(),
          message: message.trim(),
          status: "open",
        });

      if (ticketError) {
        throw ticketError;
      }

      setSelectedCategory(null);
      setSubject("");
      setMessage("");
      setSuccess(
        "Your support request has been submitted. Our support team can review it from the admin panel.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your support request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Support</span>

          <h1>Help Center</h1>

          <p>
            Choose a category and send your request to
            the Malexa support team.
          </p>
        </div>
      </div>

      {success && (
        <section className="section-block">
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>

            <h3>Request submitted</h3>

            <p>{success}</p>
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="help-category-list">
          {categories.map((category) => (
            <button
              type="button"
              className="help-category"
              key={category.title}
              onClick={() => openCategory(category.title)}
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

      {selectedCategory && (
        <div className="auth-overlay">
          <div className="auth-card">
            <h2>{selectedCategory}</h2>

            <p>
              Tell us what happened. A support administrator
              will review your request.
            </p>

            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              <label>Subject</label>

              <input
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                placeholder="Short description"
                disabled={submitting}
              />

              <label>Message</label>

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Describe your problem"
                rows={6}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />

              {error && (
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#fef2f2",
                  }}
                >
                  <p style={{ margin: 0 }}>{error}</p>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "8px",
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void submitTicket()}
                  disabled={submitting}
                  style={{ flex: 1 }}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
      {navigation.map(
        (item) => (
          <button
            key={item.id}
            type="button"
            className={
              activePage ===
              item.id
                ? "bottom-nav-item active"
                : "bottom-nav-item"
            }
            onClick={() =>
              onNavigate(
                item.id,
              )
            }
          >
            <span className="bottom-nav-icon">
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>
          </button>
        ),
      )}
    </nav>
  );
}

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <Brand />

        <span className="eyebrow">
          Digital wallet
        </span>

        <h1>
          Welcome to Malexa Wallet
        </h1>

        <p>
          Manage your account, trade through
          P2P, and keep your wallet activity in
          one place.
        </p>

        <div className="landing-features">
          <div>
            <span>✓</span>
            <strong>
              Secure account access
            </strong>
          </div>

          <div>
            <span>✓</span>
            <strong>
              P2P trading
            </strong>
          </div>

          <div>
            <span>✓</span>
            <strong>
              Account management
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        M
      </div>

      <div className="brand-text">
        <strong>
          Malexa
        </strong>

        <span>
          Wallet
        </span>
      </div>
    </div>
  );
}

function formatKycStatus(
  status: string,
): string {
  const normalized =
    status
      .replaceAll("_", " ")
      .trim();

  if (!normalized) {
    return "Not submitted";
  }

  return normalized
    .charAt(0)
    .toUpperCase() +
    normalized.slice(1);
}

export default App;
