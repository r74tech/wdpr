import type { Element } from "@wdprlib/ast";
import { isListPagesModule, resolveListPages } from "../listpages/resolve";
import { isListUsersModule, resolveListUsers } from "../listusers/resolve";
import { isTagCloudModule, resolveTagCloud } from "../tagcloud/resolve";
import { walkElements } from "../walk";
import type { ListPagesContext, ListUsersContext, TagCloudContext } from "./contexts";

export interface DynamicModuleContext {
  listPages: ListPagesContext | null;
  listUsers: ListUsersContext | null;
  tagCloud: TagCloudContext | null;
  fetchListPagesProvided: boolean;
  fetchListUsersProvided: boolean;
  fetchTagCloudProvided: boolean;
}

export interface DynamicModuleIds {
  listPagesId: number;
  listUsersId: number;
  tagCloudId: number;
}

export interface DynamicModuleResolution {
  handled: boolean;
  elements: Element[];
  ids: DynamicModuleIds;
}

export function resolveDynamicModuleElement(
  element: Element,
  ctx: DynamicModuleContext,
  ids: DynamicModuleIds,
): DynamicModuleResolution {
  if (element.element !== "module") {
    return { handled: false, elements: [element], ids };
  }

  if (isListPagesModule(element.data)) {
    const elements: Element[] = [];
    const listPagesId = ids.listPagesId;

    if (ctx.listPages) {
      const moduleData = ctx.listPages.dataMap.get(listPagesId);
      const template = ctx.listPages.compiledTemplates.get(listPagesId);

      if (moduleData && template) {
        elements.push(...resolveListPages(element.data, moduleData, template, ctx.listPages.parse));
      }
    } else if (!ctx.fetchListPagesProvided) {
      elements.push(element);
    }

    return {
      handled: true,
      elements,
      ids: { ...ids, listPagesId: listPagesId + 1 },
    };
  }

  if (isListUsersModule(element.data)) {
    const elements: Element[] = [];
    const listUsersId = ids.listUsersId;

    if (ctx.listUsers) {
      const moduleData = ctx.listUsers.dataMap.get(listUsersId);
      const template = ctx.listUsers.compiledTemplates.get(listUsersId);

      if (moduleData && template) {
        elements.push(...resolveListUsers(element.data, moduleData, template, ctx.listUsers.parse));
      }
    } else if (!ctx.fetchListUsersProvided) {
      elements.push(element);
    }

    return {
      handled: true,
      elements,
      ids: { ...ids, listUsersId: listUsersId + 1 },
    };
  }

  if (isTagCloudModule(element.data)) {
    const elements: Element[] = [];
    const tagCloudId = ids.tagCloudId;

    if (ctx.tagCloud) {
      const moduleData = ctx.tagCloud.dataMap.get(tagCloudId);

      if (moduleData) {
        elements.push(...resolveTagCloud(element.data, moduleData));
      }
    } else if (!ctx.fetchTagCloudProvided) {
      elements.push(element);
    }

    return {
      handled: true,
      elements,
      ids: { ...ids, tagCloudId: tagCloudId + 1 },
    };
  }

  return { handled: false, elements: [element], ids };
}

export function countDynamicModules(elements: Element[]): DynamicModuleIds {
  const counts: DynamicModuleIds = { listPagesId: 0, listUsersId: 0, tagCloudId: 0 };
  walkElements(elements, (element) => {
    if (element.element !== "module") return;

    if (isListPagesModule(element.data)) {
      counts.listPagesId++;
    } else if (isListUsersModule(element.data)) {
      counts.listUsersId++;
    } else if (isTagCloudModule(element.data)) {
      counts.tagCloudId++;
    }
  });
  return counts;
}
