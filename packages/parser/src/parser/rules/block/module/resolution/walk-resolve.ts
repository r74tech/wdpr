import type { Element } from "@wdprlib/ast";
import { mapElementChildrenWithState } from "../walk";
import { isIfTagsElement, resolveIfTags, type IfTagsData } from "../iftags/resolve";
import type { ListPagesContext, ListUsersContext } from "./contexts";
import { countDynamicModules, resolveDynamicModuleElement } from "./dynamic-modules";

/**
 * Resolution context passed through AST traversal.
 */
export interface WalkContext {
  listPages: ListPagesContext | null;
  listUsers: ListUsersContext | null;
  /** Whether fetchListPages callback was provided, even if no data returned. */
  fetchListPagesProvided: boolean;
  /** Whether fetchListUsers callback was provided, even if no data returned. */
  fetchListUsersProvided: boolean;
  pageTags: string[] | null;
  listPagesIdCounter: number;
  listUsersIdCounter: number;
}

export interface WalkResult {
  elements: Element[];
  nextListPagesId: number;
  nextListUsersId: number;
}

/**
 * Walk AST and resolve modules/iftags.
 */
export function walkAndResolve(elements: Element[], ctx: WalkContext): WalkResult {
  const result: Element[] = [];
  let listPagesId = ctx.listPagesIdCounter;
  let listUsersId = ctx.listUsersIdCounter;

  for (const element of elements) {
    const dynamicModule = resolveDynamicModuleElement(element, ctx, { listPagesId, listUsersId });
    if (dynamicModule.handled) {
      result.push(...dynamicModule.elements);
      listPagesId = dynamicModule.ids.listPagesId;
      listUsersId = dynamicModule.ids.listUsersId;
      continue;
    }

    if (isIfTagsElement(element)) {
      const ifTagsData = element.data as IfTagsData;
      const resolveResult = resolveIfTags(ifTagsData, ctx.pageTags);

      if (resolveResult.evaluated) {
        if (resolveResult.matched) {
          const childResult = walkAndResolve(ifTagsData.elements, {
            ...ctx,
            listPagesIdCounter: listPagesId,
            listUsersIdCounter: listUsersId,
          });
          result.push(...childResult.elements);
          listPagesId = childResult.nextListPagesId;
          listUsersId = childResult.nextListUsersId;
        } else {
          const counts = countDynamicModules(ifTagsData.elements);
          listPagesId += counts.listPagesId;
          listUsersId += counts.listUsersId;
        }
      } else {
        const childResult = walkAndResolve(ifTagsData.elements, {
          ...ctx,
          listPagesIdCounter: listPagesId,
          listUsersIdCounter: listUsersId,
        });
        result.push({
          element: "if-tags",
          data: {
            ...ifTagsData,
            elements: childResult.elements,
          },
        });
        listPagesId = childResult.nextListPagesId;
        listUsersId = childResult.nextListUsersId;
      }
      continue;
    }

    const mapped = mapElementChildrenWithState(
      element,
      { listPagesId, listUsersId },
      (children, state) => {
        const childResult = walkAndResolve(children, {
          ...ctx,
          listPagesIdCounter: state.listPagesId,
          listUsersIdCounter: state.listUsersId,
        });
        return {
          elements: childResult.elements,
          state: {
            listPagesId: childResult.nextListPagesId,
            listUsersId: childResult.nextListUsersId,
          },
        };
      },
    );
    result.push(mapped.element);
    listPagesId = mapped.state.listPagesId;
    listUsersId = mapped.state.listUsersId;
  }

  return { elements: result, nextListPagesId: listPagesId, nextListUsersId: listUsersId };
}
