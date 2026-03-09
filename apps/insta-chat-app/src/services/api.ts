const API_BASE = import.meta.env.VITE_PUBLIC_API_BASE;

export interface Chat {
  chatName: string;
  password: string;
  createdAt: string;
  expireAt: string;
}

export interface Participant {
  participantId: string;
  username: string;
  chatName: string;
  publicKey: string;
}

export async function createChat(
  chatName: string,
  password: string,
): Promise<Chat> {
  const res = await fetch(`${API_BASE}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatName, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create chat (${res.status})`);
  }

  return res.json();
}

export async function joinChat(
  chatName: string,
  password: string,
  publicKey: string,
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/chats/${encodeURIComponent(chatName)}/join`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, publicKey }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to join chat (${res.status})`);
  }

  // Response is a raw JWT string
  return res.text();
}
export async function fetchParticipants(
  chatName: string,
  token: string,
): Promise<Participant[]> {
  const res = await fetch(
    `${API_BASE}/chats/${encodeURIComponent(chatName)}/participants`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch participants (${res.status})`);
  }

  const data = await res.json();
  console.log("Current Participants:", data); // ← log DESPUÉS de parsear
  return data;
}

export async function leaveChat(chatName: string, participantId: string) {
  const res = await fetch(
    `${API_BASE}/chats/${encodeURIComponent(chatName)}/participants/${participantId}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to leave chat (${res.status})`);
  }
}
