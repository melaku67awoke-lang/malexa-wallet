import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

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
    <main>
      <h1>Malexa Wallet</h1>
      <p>{status}</p>
    </main>
  );
}

export default App;
