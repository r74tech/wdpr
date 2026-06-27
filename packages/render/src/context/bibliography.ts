import type { BibliographyBlockData, Element, ListData, TableData, TabData } from "@wdprlib/ast";

interface BibliographyState {
  map: Map<string, number>;
}

export class BibliographyIndex {
  private state: BibliographyState | null = null;

  constructor(private readonly elements: Element[]) {}

  getCitationNumber(label: string): number | undefined {
    return this.getState().map.get(label);
  }

  private getState(): BibliographyState {
    if (this.state === null) {
      this.state = collectBibliographyState(this.elements);
    }
    return this.state;
  }
}

function collectBibliographyState(elements: Element[]): BibliographyState {
  const state: BibliographyState = {
    map: new Map(),
  };
  collectFromElements(elements, state);
  return state;
}

function collectFromElements(elements: Element[], state: BibliographyState): void {
  for (const element of elements) {
    if (element.element === "bibliography-block") {
      addBlockEntries(element.data, state);
    }

    collectFromChildren(element, state);
  }
}

function addBlockEntries(data: BibliographyBlockData, state: BibliographyState): void {
  for (const entry of data.entries) {
    if (state.map.has(entry.key_string)) continue;

    state.map.set(entry.key_string, state.map.size + 1);
  }
}

function collectFromChildren(element: Element, state: BibliographyState): void {
  switch (element.element) {
    case "list":
      collectFromList(element.data, state);
      return;
    case "table":
      collectFromTable(element.data, state);
      return;
    case "definition-list":
      for (const item of element.data) {
        collectFromElements(item.key, state);
        collectFromElements(item.value, state);
      }
      return;
    case "tab-view":
      collectFromTabs(element.data, state);
      return;
    default:
      break;
  }

  if (hasElementChildren(element)) {
    collectFromElements(element.data.elements, state);
  }
}

function collectFromList(data: ListData, state: BibliographyState): void {
  for (const item of data.items) {
    if (item["item-type"] === "elements") {
      collectFromElements(item.elements, state);
    } else {
      collectFromList(item.data, state);
    }
  }
}

function collectFromTable(data: TableData, state: BibliographyState): void {
  for (const row of data.rows) {
    for (const cell of row.cells) {
      collectFromElements(cell.elements, state);
    }
  }
}

function collectFromTabs(tabs: TabData[], state: BibliographyState): void {
  for (const tab of tabs) {
    collectFromElements(tab.elements, state);
  }
}

function hasElementChildren(
  element: Element,
): element is Element & { data: { elements: Element[] } } {
  if (!("data" in element)) return false;

  const data: unknown = element.data;
  return (
    data !== null && typeof data === "object" && "elements" in data && Array.isArray(data.elements)
  );
}
