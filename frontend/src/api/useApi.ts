import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { createApiClient } from "./client";

export function useApi() {
  const { loginresult } = useAuth();
  return useMemo(
    () => createApiClient(loginresult?.tokens.access),
    [loginresult?.tokens.access],
  );
}
