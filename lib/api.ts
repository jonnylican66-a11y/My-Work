export type UserRole = "Admin" | "Member" | "Viewer";
export type UserStatus = "Active" | "Invited" | "Suspended";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
};

export type UserInput = Omit<ManagedUser, "id" | "joinedAt">;

export type DashboardMetrics = {
  totalUsers: number;
  activeSubscriptions: number;
  mrr: number;
  conversionRate: number;
  revenue: { label: string; value: number }[];
  activity: { label: string; value: number }[];
};

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
  } catch {
    throw new Error("Could not reach the API. Check that the backend is running and try again.");
  }

  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string }; user?: ManagedUser; users?: ManagedUser[]; metrics?: DashboardMetrics }
    | null;
  if (!response.ok) {
    throw new Error(body?.error?.message || `The request failed (${response.status}). Please try again.`);
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: Pick<ManagedUser, "name" | "email" | "role"> }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  getUsers: async () => (await request<{ users: ManagedUser[] }>("/users")).users,
  getMetrics: async () => (await request<{ metrics: DashboardMetrics }>("/metrics")).metrics,
  createUser: async (user: UserInput) =>
    (await request<{ user: ManagedUser }>("/users", { method: "POST", body: JSON.stringify(user) })).user,
  updateUser: async (id: string, user: UserInput) =>
    (await request<{ user: ManagedUser }>("/users/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify(user)
    })).user,
  deleteUser: (id: string) =>
    request<{ message: string }>("/users/" + encodeURIComponent(id), { method: "DELETE" })
};
