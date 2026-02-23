export type RedditUserCheckStatus = "exists" | "not_found" | "suspended" | "unavailable";

type RedditUserAboutResponse = {
  data?: {
    name?: string;
    is_suspended?: boolean;
    isSuspended?: boolean;
    suspended?: boolean;
  };
};

export async function checkRedditUserExists(username: string): Promise<RedditUserCheckStatus> {
  const encodedUsername = encodeURIComponent(username);
  const urls = [
    `https://www.reddit.com/user/${encodedUsername}/about.json`,
    `https://api.reddit.com/user/${encodedUsername}/about`
  ];

  let sawUnavailable = false;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "LeaderboardHolder/1.0"
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      });

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        sawUnavailable = true;
        continue;
      }

      const json = (await response.json()) as RedditUserAboutResponse;
      const redditData = json.data;
      const redditName = redditData?.name;

      const isSuspended = Boolean(
        redditData?.is_suspended ?? redditData?.isSuspended ?? redditData?.suspended
      );

      if (isSuspended) {
        return "suspended";
      }

      if (typeof redditName === "string" && redditName.toLowerCase() === username.toLowerCase()) {
        return "exists";
      }

      return "not_found";
    } catch (error) {
      sawUnavailable = true;
      console.error("Failed to verify reddit username", error);
    }
  }

  return sawUnavailable ? "unavailable" : "not_found";
}
