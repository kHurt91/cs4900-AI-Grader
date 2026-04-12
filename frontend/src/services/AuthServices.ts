import type { LoginResult, Role } from "../types";

const API_BASE = "http://127.0.0.1:8000/api";

export async function loginRequest(
  username: string,
  password: string,
  role: Role
): Promise<LoginResult> {
  const response = await fetch(`${API_BASE}/users/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password, role }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data;
}

export async function registerRequest(formObj: Record<string, FormDataEntryValue>) {
  const response = await fetch(`${API_BASE}/users/auth/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: formObj.first_name,
      last_name: formObj.last_name,
      email: formObj.email,
      username: formObj.username,
      password: formObj.password,
      role: formObj.role,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    let errMsg = "";
    Object.entries(data).forEach((i) => {
      errMsg += i[1] + "\n";
    });
    throw new Error(errMsg);
  }

  return data;
}