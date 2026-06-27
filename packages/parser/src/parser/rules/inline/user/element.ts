import type { Element } from "@wdprlib/ast";

export function userElement(name: string, showAvatar: boolean): Element {
  return {
    element: "user",
    data: {
      name,
      "show-avatar": showAvatar,
    },
  };
}
