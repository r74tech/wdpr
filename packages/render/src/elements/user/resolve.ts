import type { RenderContext } from "../../context";
import type { ResolvedUser } from "../../types";

export function getResolvedUser(ctx: RenderContext, username: string): ResolvedUser | null {
  return ctx.options.resolvers?.user?.(username) ?? null;
}
