import { supabase } from "./supabaseClient";

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function callMalexaApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(
    `${import.meta.env.VITE_MALEXA_API_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers ?? {}),
      },
    }
  );

  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(
      typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
        ? data.error
        : "API request failed"
    );
  }

  return data;
}
