import type { DefinitionListItem, Element, ListItem } from "@wdprlib/ast";
import type { InternalContainerData } from "./predicates";

type CleanElements = (elements: Element[]) => Element[];

export function cleanElement(el: Element, cleanElements: CleanElements): Element {
  if (el.element === "line-break") {
    return cleanLineBreak(el);
  }

  if (el.element === "container") {
    return cleanContainer(el, cleanElements);
  }

  if (el.element === "collapsible") {
    const elements = cleanElements(el.data.elements);
    if (elements === el.data.elements) {
      return el;
    }
    return {
      element: "collapsible",
      data: {
        ...el.data,
        elements,
      },
    };
  }

  if (el.element === "color") {
    const elements = cleanElements(el.data.elements);
    if (elements === el.data.elements) {
      return el;
    }
    return {
      element: "color",
      data: {
        ...el.data,
        elements,
      },
    };
  }

  if (el.element === "list") {
    let items: typeof el.data.items | null = null;
    for (let i = 0; i < el.data.items.length; i++) {
      const item = el.data.items[i]!;
      const cleaned = cleanListItem(item, cleanElements);
      if (items !== null) {
        items.push(cleaned);
      } else if (cleaned !== item) {
        items = el.data.items.slice(0, i);
        items.push(cleaned);
      }
    }

    if (items === null) {
      return el;
    }

    return {
      element: "list",
      data: {
        ...el.data,
        items,
      },
    };
  }

  if (el.element === "definition-list") {
    let items: typeof el.data | null = null;
    for (let i = 0; i < el.data.length; i++) {
      const item = el.data[i]!;
      const cleaned = cleanDefinitionListItem(item, cleanElements);
      if (items !== null) {
        items.push(cleaned);
      } else if (cleaned !== item) {
        items = el.data.slice(0, i);
        items.push(cleaned);
      }
    }

    if (items === null) {
      return el;
    }

    return {
      element: "definition-list",
      data: items,
    };
  }

  return el;
}

function cleanLineBreak(el: Element): Element {
  for (const key in el) {
    if (key !== "element") {
      return { element: "line-break" };
    }
  }
  return el;
}

function cleanContainer(el: Extract<Element, { element: "container" }>, cleanElements: CleanElements): Element {
  const data = el.data as InternalContainerData;
  const elements = cleanElements(data.elements);
  const hasInternalFlags =
    data._paragraphStrip !== undefined ||
    data._emptyParagraphStrip !== undefined ||
    data._escapedFromParagraph !== undefined ||
    data._splitByBlankLine !== undefined;

  if (!hasInternalFlags && elements === data.elements) {
    return el;
  }

  return {
    element: "container",
    data: {
      type: data.type,
      attributes: data.attributes,
      elements,
    },
  };
}

function cleanListItem(item: ListItem, cleanElements: CleanElements): ListItem {
  if (item["item-type"] === "elements") {
    const elements = cleanElements(item.elements);
    return elements === item.elements
      ? item
      : {
          ...item,
          elements,
        };
  }

  if (item["item-type"] === "sub-list") {
    const cleanedList = cleanElement({ element: "list", data: item.data }, cleanElements);
    return cleanedList.element === "list" && cleanedList.data !== item.data
      ? {
          "item-type": "sub-list",
          element: "list",
          data: cleanedList.data,
        }
      : item;
  }

  return item;
}

function cleanDefinitionListItem(
  item: DefinitionListItem,
  cleanElements: CleanElements,
): DefinitionListItem {
  const key = cleanElements(item.key);
  const value = cleanElements(item.value);
  return key === item.key && value === item.value
    ? item
    : {
        ...item,
        key,
        value,
      };
}
