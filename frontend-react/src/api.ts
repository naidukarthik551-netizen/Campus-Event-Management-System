export type User = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

export type EventItem = {
  id: number;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  active: boolean;
};

export type Registration = {
  id: number;
  eventId: number;
  userId: number;
  status: string;
  registeredAt: string;
};

export type Certificate = {
  id: number;
  certificateCode: string;
  registrationId: number;
  userId: number;
  recipientName: string;
  eventId: number;
  issuedAt: string;
};

export type Notification = {
  id: number;
  channel: string;
  recipient: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem("campus-event-token");
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error("Cannot reach the API Gateway. Check that backend services are running.");
  }

  const text = await response.text();
  const data: unknown = text ? parseResponse(text) : undefined;
  if (!response.ok) {
    const body = data as { detail?: string; message?: string; error?: string } | undefined;
    throw new Error(body?.detail ?? body?.message ?? body?.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

function parseResponse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export const api = {
  health: () => request<{ status: string }>("/actuator/health"),
  events: () => request<EventItem[]>("/api/events"),
  createEvent: (body: EventInput) => request<EventItem>("/api/events", { method: "POST", body }),
  updateEvent: (id: number, body: EventInput) =>
    request<EventItem>(`/api/events/${id}`, { method: "PUT", body }),
  deleteEvent: (id: number) => request<void>(`/api/events/${id}`, { method: "DELETE" }),
  register: (eventId: number) =>
    request<Registration>("/api/registrations", { method: "POST", body: { eventId } }),
  myRegistrations: () => request<Registration[]>("/api/registrations/mine"),
  allRegistrations: () => request<Registration[]>("/api/registrations"),
  updateRegistration: (id: number, status: string) =>
    request<Registration>(`/api/registrations/${id}/status`, { method: "PATCH", body: { status } }),
  myCertificates: () => request<Certificate[]>("/api/certificates/mine"),
  issueCertificate: (registrationId: number, recipientName: string) =>
    request<Certificate>("/api/certificates", {
      method: "POST",
      body: { registrationId, recipientName },
    }),
  myNotifications: () => request<Notification[]>("/api/notifications/mine"),
  sendNotification: (body: NotificationInput) =>
    request<Notification>("/api/notifications", { method: "POST", body }),
  registerAccount: (body: { fullName: string; email: string; password: string }) =>
    request<User>("/api/users/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<{ accessToken: string; expiresAt: string; user: User }>("/api/users/login", {
      method: "POST",
      body,
    }),
};

export type EventInput = Omit<EventItem, "id" | "active">;
export type NotificationInput = {
  channel: string;
  recipient: string;
  subject: string;
  message: string;
};
