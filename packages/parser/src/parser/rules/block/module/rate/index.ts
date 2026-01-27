import type { ModuleRule } from "../types";
import type { RateModuleData } from "./types";

export const rateModuleRule: ModuleRule = {
  name: "module-rate",
  acceptsNames: ["rate"],
  hasBody: false,

  parse(): RateModuleData {
    return { module: "rate" };
  },
};
