import type { Element } from "@wdprlib/ast";

export interface StatefulTransformResult<S> {
  elements: Element[];
  state: S;
}
