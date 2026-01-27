import type { ModuleRule } from "../types";
import type { JoinModuleData } from "./types";

export const joinModuleRule: ModuleRule = {
  name: "module-join",
  acceptsNames: ["join"],
  hasBody: false,

  parse(_ctx, _pos, args): JoinModuleData {
    const { button, ...rest } = args;
    return {
      module: "join",
      "button-text": button ?? null,
      attributes: rest,
    };
  },
};
