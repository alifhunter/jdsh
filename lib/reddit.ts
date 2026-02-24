export type RedditUserCheckStatus = "exists" | "not_found" | "suspended" | "unavailable";
export type RedditCheckStrategy = "public" | "oauth" | "auto";

type CheckRedditUserOptions = {
  strategy?: RedditCheckStrategy;
};

type RedditUserAboutResponse = {
  data?: {
    name?: string;
    is_suspended?: boolean;
    isSuspended?: boolean;
    suspended?: boolean;
  };
};

type FetchTryResult = {
  response: Response;
} | {
  error: unknown;
};

type RedditOAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

const DEFAULT_USER_AGENT = "LeaderboardHolder/1.0";
const REQUEST_TIMEOUT_MS = 7000;
const RETRIES = 2;

const globalForRedditOAuth = globalThis as unknown as {
  redditOAuthToken?: {
    accessToken: string;
    expiresAt: number;
  };
};

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getUserAgent() {
  return process.env.REDDIT_USER_AGENT?.trim() || DEFAULT_USER_AGENT;
}

function hasOAuthCredentials() {
  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret);
}

function buildHeaders(extraHeaders?: HeadersInit) {
  const headers = new Headers({
    "User-Agent": getUserAgent(),
    "Accept": "application/json,text/html;q=0.9,*/*;q=0.8"
  });

  if (extraHeaders) {
    const mergedHeaders = new Headers(extraHeaders);
    mergedHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<FetchTryResult> {
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: buildHeaders(init?.headers),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });

      return { response };
    } catch (error) {
      if (attempt === RETRIES) {
        return { error };
      }

      await sleep(250 * (attempt + 1));
    }
  }

  return { error: new Error("Unknown fetch failure") };
}

function extractSuspendedFlag(data: RedditUserAboutResponse["data"]): boolean {
  return Boolean(data?.is_suspended ?? data?.isSuspended ?? data?.suspended);
}

function resolveUserAboutStatus(
  data: RedditUserAboutResponse["data"],
  username: string
): RedditUserCheckStatus {
  if (!data) {
    return "unavailable";
  }

  if (extractSuspendedFlag(data)) {
    return "suspended";
  }

  if (typeof data.name === "string" && data.name.toLowerCase() === username.toLowerCase()) {
    return "exists";
  }

  return "not_found";
}

function parseProfileHtmlStatus(html: string): RedditUserCheckStatus | null {
  const lowered = html.toLowerCase();

  if (lowered.includes("this account has been suspended")) {
    return "suspended";
  }

  if (
    lowered.includes("sorry, nobody on reddit goes by that name") ||
    lowered.includes("looks like reddit is having some trouble")
  ) {
    return "not_found";
  }

  if (lowered.includes("<shreddit-post") || lowered.includes("<shreddit-app")) {
    return "exists";
  }

  return null;
}

async function checkViaJsonAbout(username: string): Promise<RedditUserCheckStatus> {
  const encodedUsername = encodeURIComponent(username);
  const urls = [
    `https://www.reddit.com/user/${encodedUsername}/about.json`,
    `https://api.reddit.com/user/${encodedUsername}/about`,
    `https://old.reddit.com/user/${encodedUsername}/about.json`
  ];

  let sawUnavailable = false;
  let sawNotFound = false;

  for (const url of urls) {
    const result = await fetchWithRetry(url);

    if ("error" in result) {
      sawUnavailable = true;
      console.error("Failed to verify reddit username", result.error);
      continue;
    }

    const { response } = result;

    if (response.status === 404) {
      sawNotFound = true;
      continue;
    }

    if (response.status === 429 || response.status >= 500 || response.status === 403) {
      sawUnavailable = true;
      continue;
    }

    if (!response.ok) {
      sawUnavailable = true;
      continue;
    }

    let json: RedditUserAboutResponse;
    try {
      json = (await response.json()) as RedditUserAboutResponse;
    } catch (error) {
      console.error("Failed to parse reddit about json", error);
      sawUnavailable = true;
      continue;
    }

    const status = resolveUserAboutStatus(json.data, username);
    if (status === "exists" || status === "suspended") {
      return status;
    }
    if (status === "not_found") {
      sawNotFound = true;
      continue;
    }
    if (status === "unavailable") {
      sawUnavailable = true;
      continue;
    }
  }

  if (sawNotFound && !sawUnavailable) {
    return "not_found";
  }

  return sawUnavailable ? "unavailable" : "not_found";
}

async function checkViaHtmlProfile(username: string): Promise<RedditUserCheckStatus> {
  const profileUrl = `https://www.reddit.com/user/${encodeURIComponent(username)}/`;
  const result = await fetchWithRetry(profileUrl);

  if ("error" in result) {
    console.error("Failed to verify reddit username via html", result.error);
    return "unavailable";
  }

  const { response } = result;

  if (response.status === 404) {
    return "not_found";
  }

  if (response.status === 429 || response.status >= 500 || response.status === 403) {
    return "unavailable";
  }

  if (!response.ok) {
    return "unavailable";
  }

  const html = await response.text();
  const parsed = parseProfileHtmlStatus(html);

  if (parsed) {
    return parsed;
  }

  return "unavailable";
}

async function getRedditOAuthAccessToken(forceRefresh = false): Promise<string | null> {
  const now = Date.now();
  const cached = globalForRedditOAuth.redditOAuthToken;

  if (!forceRefresh && cached && cached.expiresAt > now) {
    return cached.accessToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials"
  });

  const result = await fetchWithRetry("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body
  });

  if ("error" in result) {
    console.error("Failed to get Reddit OAuth token", result.error);
    return null;
  }

  const { response } = result;

  if (response.status === 429 || response.status >= 500) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let payload: RedditOAuthTokenResponse;
  try {
    payload = (await response.json()) as RedditOAuthTokenResponse;
  } catch (error) {
    console.error("Failed to parse Reddit OAuth token response", error);
    return null;
  }

  const accessToken = payload.access_token;
  if (!accessToken) {
    return null;
  }

  const expiresInSeconds = Math.max(60, Math.floor(payload.expires_in ?? 3600));
  const expiresAt = now + Math.max(60_000, (expiresInSeconds - 60) * 1000);

  globalForRedditOAuth.redditOAuthToken = {
    accessToken,
    expiresAt
  };

  return accessToken;
}

async function checkViaOAuth(username: string): Promise<RedditUserCheckStatus> {
  let accessToken = await getRedditOAuthAccessToken();
  if (!accessToken) {
    return "unavailable";
  }

  const url = `https://oauth.reddit.com/user/${encodeURIComponent(username)}/about`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await fetchWithRetry(url, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json"
      }
    });

    if ("error" in result) {
      console.error("Failed to verify reddit username via oauth", result.error);
      return "unavailable";
    }

    const { response } = result;

    if (response.status === 401 && attempt === 0) {
      accessToken = await getRedditOAuthAccessToken(true);
      if (!accessToken) {
        return "unavailable";
      }

      continue;
    }

    if (response.status === 404) {
      return "not_found";
    }

    if (response.status === 429 || response.status >= 500 || response.status === 403) {
      return "unavailable";
    }

    if (!response.ok) {
      return "unavailable";
    }

    let json: RedditUserAboutResponse;
    try {
      json = (await response.json()) as RedditUserAboutResponse;
    } catch (error) {
      console.error("Failed to parse reddit oauth about response", error);
      return "unavailable";
    }

    return resolveUserAboutStatus(json.data, username);
  }

  return "unavailable";
}

async function checkViaPublicEndpoints(username: string): Promise<RedditUserCheckStatus> {
  const viaJson = await checkViaJsonAbout(username);

  if (viaJson === "exists" || viaJson === "suspended" || viaJson === "not_found") {
    return viaJson;
  }

  return checkViaHtmlProfile(username);
}

export async function checkRedditUserExists(
  username: string,
  options?: CheckRedditUserOptions
): Promise<RedditUserCheckStatus> {
  const normalizedUsername = username.trim();
  const strategy = options?.strategy ?? "public";

  if (strategy === "oauth") {
    return checkViaOAuth(normalizedUsername);
  }

  if (strategy === "auto") {
    if (hasOAuthCredentials()) {
      const viaOAuth = await checkViaOAuth(normalizedUsername);
      if (viaOAuth !== "unavailable") {
        return viaOAuth;
      }
    }

    return checkViaPublicEndpoints(normalizedUsername);
  }

  return checkViaPublicEndpoints(normalizedUsername);
}
