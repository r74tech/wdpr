export function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export function isValidGithubUsername(username: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username);
}

export function isValidGistHash(hash: string): boolean {
  return /^[a-f0-9]+$/.test(hash);
}

export function isValidGitlabSnippetId(id: string): boolean {
  return /^[0-9]+$/.test(id);
}
