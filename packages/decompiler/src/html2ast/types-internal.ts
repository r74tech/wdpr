import type { Element } from "@wdprlib/ast";
import type { Element as DomElement } from "domhandler";

/** Function signature that converts child DOM nodes into AST elements. */
export type ChildrenRecognizer = (node: DomElement) => Element[];
