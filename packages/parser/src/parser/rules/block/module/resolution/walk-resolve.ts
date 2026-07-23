import type { Element } from "@wdprlib/ast";
import { mapElementChildrenWithState } from "../walk";
import { isIfTagsElement, resolveIfTags, type IfTagsData } from "../iftags/resolve";
import type { ListPagesContext, ListUsersContext, TagCloudContext } from "./contexts";
import { countDynamicModules, resolveDynamicModuleElement } from "./dynamic-modules";
import { collectStyles, createStyleSlotMarker, getStyleSlotId } from "./styles";

/**
 * Resolution context passed through AST traversal.
 */
export interface WalkContext {
  listPages: ListPagesContext | null;
  listUsers: ListUsersContext | null;
  tagCloud: TagCloudContext | null;
  /** Whether fetchListPages callback was provided, even if no data returned. */
  fetchListPagesProvided: boolean;
  /** Whether fetchListUsers callback was provided, even if no data returned. */
  fetchListUsersProvided: boolean;
  /** Whether fetchTagCloud callback was provided, even if no data returned. */
  fetchTagCloudProvided: boolean;
  pageTags: string[] | null;
  listPagesIdCounter: number;
  listUsersIdCounter: number;
  tagCloudIdCounter: number;
  resolvedStyleSlots: Map<number, string[]>;
  routedStyleAnchors: WeakSet<Element>;
}

export interface WalkResult {
  elements: Element[];
  nextListPagesId: number;
  nextListUsersId: number;
  nextTagCloudId: number;
}

/**
 * Walk AST and resolve modules/iftags.
 */
export function walkAndResolve(elements: Element[], ctx: WalkContext): WalkResult {
  const result: Element[] = [];
  let listPagesId = ctx.listPagesIdCounter;
  let listUsersId = ctx.listUsersIdCounter;
  let tagCloudId = ctx.tagCloudIdCounter;

  for (const element of elements) {
    const dynamicModule = resolveDynamicModuleElement(element, ctx, {
      listPagesId,
      listUsersId,
      tagCloudId,
    });
    if (dynamicModule.handled) {
      result.push(...dynamicModule.elements);
      listPagesId = dynamicModule.ids.listPagesId;
      listUsersId = dynamicModule.ids.listUsersId;
      tagCloudId = dynamicModule.ids.tagCloudId;
      continue;
    }

    if (isIfTagsElement(element)) {
      const ifTagsData = element.data as IfTagsData;
      const resolveResult = resolveIfTags(ifTagsData, ctx.pageTags);
      const styleSlotId = getStyleSlotId(ifTagsData);

      if (resolveResult.evaluated) {
        if (resolveResult.matched) {
          const childResult = walkAndResolve(ifTagsData.elements, {
            ...ctx,
            listPagesIdCounter: listPagesId,
            listUsersIdCounter: listUsersId,
            tagCloudIdCounter: tagCloudId,
          });
          if (styleSlotId === undefined) {
            result.push(...childResult.elements);
          } else {
            const collected = collectStyles(childResult.elements);
            ctx.resolvedStyleSlots.set(styleSlotId, collected.styles);
            for (const anchor of collected.anchors) ctx.routedStyleAnchors.add(anchor);
            result.push(
              { element: "style", data: createStyleSlotMarker(styleSlotId) },
              ...collected.elements,
            );
          }
          listPagesId = childResult.nextListPagesId;
          listUsersId = childResult.nextListUsersId;
          tagCloudId = childResult.nextTagCloudId;
        } else {
          if (styleSlotId !== undefined) {
            ctx.resolvedStyleSlots.set(styleSlotId, []);
            result.push({ element: "style", data: createStyleSlotMarker(styleSlotId) });
          }
          const counts = countDynamicModules(ifTagsData.elements);
          listPagesId += counts.listPagesId;
          listUsersId += counts.listUsersId;
          tagCloudId += counts.tagCloudId;
        }
      } else {
        const childResult = walkAndResolve(ifTagsData.elements, {
          ...ctx,
          listPagesIdCounter: listPagesId,
          listUsersIdCounter: listUsersId,
          tagCloudIdCounter: tagCloudId,
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
        tagCloudId = childResult.nextTagCloudId;
      }
      continue;
    }

    const mapped = mapElementChildrenWithState(
      element,
      { listPagesId, listUsersId, tagCloudId },
      (children, state) => {
        const childResult = walkAndResolve(children, {
          ...ctx,
          listPagesIdCounter: state.listPagesId,
          listUsersIdCounter: state.listUsersId,
          tagCloudIdCounter: state.tagCloudId,
        });
        return {
          elements: childResult.elements,
          state: {
            listPagesId: childResult.nextListPagesId,
            listUsersId: childResult.nextListUsersId,
            tagCloudId: childResult.nextTagCloudId,
          },
        };
      },
    );
    result.push(mapped.element);
    listPagesId = mapped.state.listPagesId;
    listUsersId = mapped.state.listUsersId;
    tagCloudId = mapped.state.tagCloudId;
  }

  return {
    elements: result,
    nextListPagesId: listPagesId,
    nextListUsersId: listUsersId,
    nextTagCloudId: tagCloudId,
  };
}
