import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Checking connection...");

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      const { error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setStatus("Supabase connection error");
        return;
      }

      setStatus("Supabase connected");
    };

    void checkConnection();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Malexa Wallet</h1>
        <p>Secure digital wallet platform</p>
      </header>

      <main className="app-content">
        <section className="status-card">
          <h2>Welcome to Malexa Wallet</h2>
          <p>{status}</p>
        </section>
      </main>
    </div>
  );
}

export default App;
