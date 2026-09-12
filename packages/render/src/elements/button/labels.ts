import type { PageButtonAction } from "@wdprlib/ast";
import type { RenderContext } from "../../context";

export function buttonLabel(ctx: RenderContext, action: PageButtonAction): string {
  switch (action) {
    case "edit":
      return ctx.messages.text({ id: "button.edit", defaultMessage: "edit" });
    case "edit-append":
      return ctx.messages.text({ id: "button.edit-append", defaultMessage: "append" });
    case "edit-sections":
      return ctx.messages.text({ id: "button.edit-sections", defaultMessage: "edit sections" });
    case "history":
      return ctx.messages.text({ id: "button.history", defaultMessage: "history" });
    case "print":
      return ctx.messages.text({ id: "button.print", defaultMessage: "print" });
    case "files":
      return ctx.messages.text({ id: "button.files", defaultMessage: "files" });
    case "tags":
      return ctx.messages.text({ id: "button.tags", defaultMessage: "tags" });
    case "source":
      return ctx.messages.text({ id: "button.source", defaultMessage: "view source" });
    case "backlinks":
      return ctx.messages.text({ id: "button.backlinks", defaultMessage: "backlinks" });
    case "talk":
      return ctx.messages.text({ id: "button.talk", defaultMessage: "talk" });
    case "delete":
      return ctx.messages.text({ id: "button.delete", defaultMessage: "delete" });
    case "rename":
      return ctx.messages.text({ id: "button.rename", defaultMessage: "rename" });
    case "site-tools":
      return ctx.messages.text({ id: "button.site-tools", defaultMessage: "site tools" });
    case "edit-meta":
      return ctx.messages.text({ id: "button.edit-meta", defaultMessage: "edit meta" });
    case "watchers":
      return ctx.messages.text({ id: "button.watchers", defaultMessage: "watchers" });
    case "parent":
      return ctx.messages.text({ id: "button.parent", defaultMessage: "parent" });
    case "lock-page":
      return ctx.messages.text({ id: "button.lock-page", defaultMessage: "lock page" });
  }
}
