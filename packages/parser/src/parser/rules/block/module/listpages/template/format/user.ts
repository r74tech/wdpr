import type { UserInfo } from "../../types";

/**
 * Format a user as Wikidot's `[[*user name]]` inline syntax for linked display.
 */
export function formatUserLinked(user?: UserInfo): string {
  if (!user) return "Anonymous";
  return `[[*user ${user.name}]]`;
}
