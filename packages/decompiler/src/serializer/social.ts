import type { SocialData } from "@wdprlib/ast";
import type { SerializeContext } from "./context";
import { literalizeWikitext } from "./directive-safety";

export function serializeSocial(ctx: SerializeContext, data: SocialData): void {
  const sites = data.sites === null ? "" : ` ${data.sites.length ? data.sites.join(",") : ","}`;
  ctx.push(sites.includes("]") ? literalizeWikitext(sites) : `[[social${sites}]]`);
}
