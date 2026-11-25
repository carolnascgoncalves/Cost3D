import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession, ApiError } from "../src/api/session-client.ts";
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });
function client(fetch, web = false) {
  let refresh = "initial";
  const storage = {
    get: async () => refresh,
    set: async (value) => {
      refresh = value;
    },
    clear: async () => {
      refresh = null;
    },
  };
  return {
    session: createSession({ fetch, web, url: "http://api.test", storage }),
    stored: () => refresh,
  };
}
test("native login sends senha and stores refresh only; me uses bearer", async () => {
  const { session, stored } = client(async (url, init) => {
    if (url.endsWith("/login")) {
      assert.deepEqual(JSON.parse(init.body), {
        email: "a@b.com",
        senha: "secret",
      });
      assert.equal(init.credentials, "omit");
      return json({ accessToken: "access", refreshToken: "refresh" });
    }
    assert.equal(init.headers.Authorization, "Bearer access");
    return json({ email: "a@b.com" });
  });
  assert.equal((await session.login(" a@b.com ", "secret")).email, "a@b.com");
  assert.equal(stored(), "refresh");
});
test("web uses HttpOnly cookie endpoints and never writes refresh storage", async () => {
  const seen = [];
  const { session, stored } = client(async (url, init) => {
    seen.push(url);
    assert.equal(init.credentials, "include");
    assert.equal(init.headers["X-Cost3D-Web"], "1");
    return url.endsWith("/me")
      ? json({ email: "web" })
      : json({ accessToken: "access" });
  }, true);
  await session.login("web", "secret");
  await session.refreshSession();
  await session.logout();
  assert.equal(stored(), "initial");
  assert.ok(seen.some((x) => x.endsWith("/auth/web/login")));
  assert.ok(seen.some((x) => x.endsWith("/auth/web/refresh")));
  assert.ok(seen.some((x) => x.endsWith("/auth/web/logout")));
});
test("concurrent 401 calls rotate refresh once and retry with the new access token", async () => {
  let rotations = 0;
  const { session, stored } = client(async (url, init) => {
    if (url.endsWith("/refresh")) {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return json({ accessToken: "new", refreshToken: "rotated" });
    }
    return init.headers.Authorization === "Bearer new"
      ? json({ ok: true })
      : json({ detail: "Expired" }, 401);
  });
  const result = await Promise.all([
    session.request("/tenant"),
    session.request("/auth/me"),
    session.request("/clientes"),
  ]);
  assert.equal(rotations, 1);
  assert.equal(stored(), "rotated");
  assert.ok(result.every((x) => x.ok));
});
test("rejected refresh clears session and notifies the app", async () => {
  let expired = 0;
  const { session, stored } = client(async () =>
    json({ detail: "Expired" }, 401),
  );
  session.onSessionExpired(() => expired++);
  await assert.rejects(
    session.request("/tenant"),
    (e) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(expired, 1);
  assert.equal(stored(), null);
});
test("network failure preserves refresh and is not automatically retried", async () => {
  let calls = 0;
  const { session, stored } = client(async () => {
    calls++;
    throw new Error("offline");
  });
  await assert.rejects(session.request("/tenant"), (e) => e.status === 0);
  assert.equal(calls, 1);
  assert.equal(stored(), "initial");
});
test("permission errors do not trigger refresh", async () => {
  let calls = 0;
  const { session } = client(async () => {
    calls++;
    return json({ detail: "Troque sua senha" }, 403);
  });
  await assert.rejects(session.request("/tenant"), /Troque sua senha/);
  assert.equal(calls, 1);
});
test("a repeated 401 stops after a single refresh and retry", async () => {
  let calls = 0;
  const { session } = client(async (url) => {
    calls++;
    return url.endsWith("/refresh")
      ? json({ accessToken: "new", refreshToken: "rotated" })
      : json({}, 401);
  });
  await assert.rejects(session.request("/tenant"), (e) => e.status === 401);
  assert.equal(calls, 3);
});
test("logout clears local native session even when server is unavailable", async () => {
  const { session, stored } = client(async () => {
    throw new Error("offline");
  });
  await assert.rejects(session.logout());
  assert.equal(stored(), null);
});
test("late refresh cannot restore a cleared session", async () => {
  let resolve;
  const { session, stored } = client(
    async () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = session.refreshSession();
  await new Promise((done) => setImmediate(done));
  await session.clearSession();
  resolve(json({ accessToken: "late", refreshToken: "late" }));
  await pending;
  assert.equal(stored(), null);
});

test("web logout failure keeps the account usable so the user can retry", async () => {
  const { session } = client(async (url, init) => {
    if (url.endsWith("/logout")) throw new Error("offline");
    if (url.endsWith("/login")) return json({ accessToken: "active" });
    assert.equal(init.headers.Authorization, "Bearer active");
    return json({ email: "web" });
  }, true);
  await session.login("web", "secret");
  await assert.rejects(session.logout(), (e) => e.status === 0);
  assert.equal((await session.request("/auth/me")).email, "web");
});
test("web session mutations run through the supplied browser lock", async () => {
  let locks = 0;
  const session = createSession({
    web: true,
    url: "http://api.test",
    fetch: async () => json({ accessToken: "active" }),
    storage: {
      get: async () => null,
      set: async () => {},
      clear: async () => {},
    },
    exclusive: async (action) => {
      locks++;
      return action();
    },
  });
  await session.login("web", "secret");
  await session.refreshSession();
  await session.logout();
  assert.equal(locks, 3);
});

test("envio nativo mantém o arquivo 3MF e a autenticação no multipart", async () => {
  const data = new FormData();
  data.append("arquivo3mf", new Blob(["PK-3MF"]), "modelo.gcode.3mf");
  const session = createSession({
    web: false,
    url: "http://api.test",
    storage: {
      get: async () => "refresh",
      set: async () => {},
      clear: async () => {},
    },
    fetch: async () => json({ accessToken: "token" }),
    upload: async (url, body, headers) => {
      assert.equal(url, "http://api.test/api/v1/catalogo/pecas/ler-arquivo");
      assert.equal(headers.Authorization, "Bearer token");
      const multipart = new Request(url, { method: "POST", body, headers });
      assert.match(
        multipart.headers.get("content-type"),
        /multipart\/form-data; boundary=/,
      );
      const file = (await multipart.formData()).get("arquivo3mf");
      assert.equal(file.name, "modelo.gcode.3mf");
      assert.equal(await file.text(), "PK-3MF");
      return json({ nomeArquivo: file.name });
    },
  });
  await session.refreshSession();
  assert.equal(
    (
      await session.request("/catalogo/pecas/ler-arquivo", {
        method: "POST",
        body: data,
      })
    ).nomeArquivo,
    "modelo.gcode.3mf",
  );
});
