export type RedditUserCheckStatus = "exists" | "not_found" | "suspended" | "unavailable";

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

const USER_AGENT = "LeaderboardHolder/1.0";
const REQUEST_TIMEOUT_MS = 7000;
const RETRIES = 2;

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(url: string): Promise<FetchTryResult> {
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json,text/html;q=0.9,*/*;q=0.8"
        },
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

    const json = (await response.json()) as RedditUserAboutResponse;
    const data = json.data;

    if (!data) {
      sawUnavailable = true;
      continue;
    }

    if (extractSuspendedFlag(data)) {
      return "suspended";
    }

    if (typeof data.name === "string" && data.name.toLowerCase() === username.toLowerCase()) {
      return "exists";
    }

    sawNotFound = true;
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

export async function checkRedditUserExists(username: string): Promise<RedditUserCheckStatus> {
  const viaJson = await checkViaJsonAbout(username);

  if (viaJson === "exists" || viaJson === "suspended" || viaJson === "not_found") {
    return viaJson;
  }

  return checkViaHtmlProfile(username);
}
