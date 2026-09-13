import type { CustomRateModuleData, RateModuleData } from "@wdprlib/ast";
import type { ModuleRule } from "../types";

/** The main rating accepts no page, axis, policy, or permission attributes. */
export const rateModuleRule: ModuleRule = {
  name: "module-rate",
  acceptsNames: ["rate"],
  hasBody: false,
  parse(_ctx, _pos, args): RateModuleData {
    return { module: "rate", ref: Object.keys(args).length === 0 ? { kind: "main" } : null };
  },
};

/** Reference an exact, host-registered key on the displayed page. */
export const customRateModuleRule: ModuleRule = {
  name: "module-custom-rate",
  acceptsNames: ["customrate"],
  hasBody: false,
  parse(_ctx, _pos, args): CustomRateModuleData {
    const key = args.key;
    const valid =
      key !== undefined && key !== "" && Object.keys(args).every((name) => name === "key");
    return { module: "custom-rate", ref: valid ? { kind: "custom", axisKey: key } : null };
  },
};
