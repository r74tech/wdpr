export interface EmailScan {
  end?: number;
  address?: string;
  localEnd: number;
  comments: Array<{ start: number; end: number }>;
}

export function isDomainChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45
  );
}

export function isLocalChar(code: number): boolean {
  return isDomainChar(code) || code === 95;
}

/** Read Email.php's grammar from one possible start, ignoring complete comments. */
export function scanEmail(
  source: string,
  start: number,
  commentEnd: (pos: number) => number,
): EmailScan {
  const comments: EmailScan["comments"] = [];
  let pos = start;
  const skipComments = () => {
    let end = commentEnd(pos);
    while (end > pos) {
      comments.push({ start: pos, end });
      pos = end;
      end = commentEnd(pos);
    }
  };
  let localPart = false;
  while (pos < source.length) {
    skipComments();
    if (isLocalChar(source.charCodeAt(pos))) {
      localPart = true;
      pos++;
    } else if (source[pos] === "." && localPart) {
      localPart = false;
      pos++;
    } else break;
  }
  const localEnd = pos;
  if (!localPart || source[pos] !== "@") return { localEnd, comments };
  pos++;
  let domainPart = false;
  let dots = 0;
  let end = -1;
  while (pos < source.length) {
    skipComments();
    if (isDomainChar(source.charCodeAt(pos))) {
      domainPart = true;
      pos++;
      if (dots > 0) end = pos;
    } else if (source[pos] === "." && domainPart) {
      domainPart = false;
      dots++;
      pos++;
    } else break;
  }
  if (end === -1) return { localEnd, comments };
  const parts: string[] = [];
  let copied = start;
  for (const comment of comments) {
    if (comment.start >= end) break;
    parts.push(source.slice(copied, comment.start));
    copied = comment.end;
  }
  parts.push(source.slice(copied, end));
  return { end, address: parts.join(""), localEnd, comments };
}
