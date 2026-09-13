import { formatDate } from "../format";
import { literalWikitext } from "../literal";
import type { VariableGetter } from "./types";

/** Unavailable values stay empty; zero is an available aggregate. */
export function createRegisteredGetter(
  name: string,
  key: string,
  format?: string,
): VariableGetter | null {
  if (name === "metadata")
    return (ctx) => {
      const metadata = ctx.page.metadata;
      const entry = metadata && Object.hasOwn(metadata, key) ? metadata[key] : null;
      if (!entry) return "";
      let value: string;
      switch (entry.type) {
        case "text":
          value = entry.value;
          break;
        case "number":
          value = String(entry.value);
          break;
        case "date":
          value = formatDate(entry.value, format);
          break;
        case "user":
          value =
            format === "id"
              ? String(entry.value.id)
              : format === "unix"
                ? entry.value.unixName
                : entry.value.name;
          break;
      }
      return literalWikitext(value);
    };
  if (name === "customrate" || name === "customrate_votes" || name === "customrate_percent")
    return (ctx) => {
      const ratings = ctx.page.customRates;
      const entry = ratings && Object.hasOwn(ratings, key) ? ratings[key] : null;
      if (!entry) return "";
      return String(
        name === "customrate"
          ? entry.points
          : name === "customrate_votes"
            ? entry.votes
            : entry.percent,
      );
    };
  return null;
}
