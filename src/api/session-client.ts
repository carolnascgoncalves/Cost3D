import type { components } from "./schema";
export type Account = components["schemas"]["Conta"];
export type TenantTheme = components["schemas"]["Tema"];
type Tokens = components["schemas"]["Tokens"];
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
type Options = {
  web: boolean;
  url: string;
  fetch: typeof fetch;
  upload?: (
    url: string,
    body: FormData,
    headers: HeadersInit,
  ) => Promise<Pick<Response, "ok" | "status" | "json">>;
  exclusive?: <T>(action: () => Promise<T>) => Promise<T>;
  storage: {
    get: () => Promise<string | null>;
    set: (value: string) => Promise<void>;
    clear: () => Promise<void>;
  };
};
export function createSession(options: Options) {
  const { web, storage } = options;
  const exclusive =
    options.exclusive || (async <T>(action: () => Promise<T>) => action());
  let access: string | undefined;
  let renewing: Promise<void> | undefined;
  let epoch = 0;
  let expired = () => {};
  async function raw(path: string, init: RequestInit = {}) {
    let response: Pick<Response, "ok" | "status" | "json">;
    try {
      const url = options.url + "/api/v1" + path;
      response =
        options.upload && init.body instanceof FormData
          ? await options.upload(url, init.body, init.headers ?? {})
          : await options.fetch(url, {
              ...init,
              credentials: web ? "include" : "omit",
              headers: {
                ...(typeof FormData !== "undefined" &&
                init.body instanceof FormData
                  ? {}
                  : { "Content-Type": "application/json" }),
                ...(web ? { "X-Cost3D-Web": "1" } : {}),
                ...init.headers,
              },
            });
    } catch {
      throw new ApiError(
        0,
        init.body instanceof FormData
          ? "Não foi possível enviar o arquivo. Confira se ele está disponível no aparelho e se o servidor está acessível."
          : "Não foi possível conectar à API. Confira a conexão e o endereço do servidor.",
      );
    }
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        problem.detail || `Não foi possível concluir (${response.status}).`,
        problem.codigo,
      );
    }
    return response;
  }
  async function accept(tokens: Tokens, version: number) {
    if (version !== epoch) return;
    if (!web && tokens.refreshToken) await storage.set(tokens.refreshToken);
    if (version === epoch) access = tokens.accessToken;
    else if (!web) await storage.clear();
  }
  async function clearSession() {
    epoch++;
    access = undefined;
    if (!web) await storage.clear();
  }
  async function refreshSession() {
    if (renewing) return renewing;
    const version = epoch;
    renewing = exclusive(async () => {
      const refreshToken = web ? undefined : await storage.get();
      if (!web && !refreshToken)
        throw new ApiError(401, "Entre para continuar.");
      const response = await raw(web ? "/auth/web/refresh" : "/auth/refresh", {
        method: "POST",
        body: JSON.stringify(web ? {} : { refreshToken }),
      });
      await accept(await response.json(), version);
    }).finally(() => {
      renewing = undefined;
    });
    return renewing;
  }
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const version = epoch;
    const token = access;
    const send = () =>
      raw(path, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${access}` },
      });
    let response: Pick<Response, "ok" | "status" | "json">;
    try {
      response = await send();
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        version !== epoch
      )
        throw error;
      try {
        if (token === access) await refreshSession();
        response = await send();
      } catch (retryError) {
        if (
          retryError instanceof ApiError &&
          retryError.status === 401 &&
          version === epoch
        ) {
          await clearSession();
          expired();
        }
        throw retryError;
      }
    }
    return response.status === 204 ? (undefined as T) : response.json();
  }
  async function login(email: string, senha: string) {
    if (renewing) await renewing.catch(() => {});
    const version = ++epoch;
    await exclusive(async () => {
      const response = await raw(web ? "/auth/web/login" : "/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), senha }),
      });
      await accept(await response.json(), version);
    });
    return request<Account>("/auth/me");
  }
  async function logout() {
    if (web) {
      if (renewing) await renewing.catch(() => {});
      await exclusive(() => raw("/auth/web/logout", { method: "POST" }));
      await clearSession();
      return;
    }
    try {
      if (renewing) await renewing;
      await request("/auth/logout", { method: "POST" });
    } finally {
      await clearSession();
    }
  }
  return {
    login,
    logout,
    request,
    refreshSession,
    clearSession,
    onSessionExpired(callback: () => void) {
      expired = callback;
    },
  };
}
