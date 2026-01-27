/**
 * Shared type definitions
 */

/**
 * Cloudflare Workers environment bindings
 */
export interface Bindings {
  DB: D1Database;
  FILES: R2Bucket;
  FILES_BASE_URL?: string;
}

/**
 * Site configuration
 */
export const SITE = {
  title: "WikidotMock",
  name: "wikidotmock",
  domain: "localhost",
} as const;

/**
 * User info
 */
export interface UserInfo {
  id: number;
  name: string;
  unixName: string;
}

export const USERS: Record<number, UserInfo> = {
  1: { id: 1, name: "admin", unixName: "admin" },
  2: { id: 2, name: "user", unixName: "user" },
};

export function getUserInfo(userId: number): UserInfo {
  return USERS[userId] ?? USERS[2];
}
