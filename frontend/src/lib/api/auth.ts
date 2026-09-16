export interface ResearcherProfile {
  researcher_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_drive_granted: boolean;
  session_expires_at: string;
}

export interface ApiError {
  error: string;
  message: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getGoogleLoginUrl(prompt: "consent" | "select_account" = "consent"): string {
  return `${BACKEND_URL}/auth/google/login?prompt=${prompt}`;
}

export async function fetchCurrentUser(): Promise<ResearcherProfile | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (res.status === 401) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch current user: ${res.statusText}`);
    }

    const data: ResearcherProfile = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export async function logout(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return res.ok;
  } catch (error) {
    console.error("Error during logout:", error);
    return false;
  }
}
