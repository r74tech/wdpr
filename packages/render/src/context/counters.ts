export class RenderCounters {
  private tocIndex = 0;
  private footnoteIndex = 0;
  private equationIndex = 0;
  private htmlBlockIndex = 0;
  private bibciteCounter = 0;
  private tabViewIndex = 0;
  private readonly idSuffix: string | null;

  constructor(useTrueIds: boolean) {
    this.idSuffix = useTrueIds ? null : Math.random().toString(16).slice(2, 8);
  }

  nextTocIndex(): number {
    return this.tocIndex++;
  }

  nextFootnoteIndex(): number {
    return this.footnoteIndex++;
  }

  nextEquationIndex(): number {
    return this.equationIndex++;
  }

  nextHtmlBlockIndex(): number {
    return this.htmlBlockIndex++;
  }

  nextBibciteCounter(): number {
    return ++this.bibciteCounter;
  }

  nextTabViewIndex(): number {
    return this.tabViewIndex++;
  }

  generateId(prefix: string, index: number | string): string {
    if (this.idSuffix === null) {
      return `${prefix}${index}`;
    }
    return `${prefix}${index}-${this.idSuffix}`;
  }

  generateFixedId(name: string): string {
    if (this.idSuffix === null) {
      return name;
    }
    return `${name}-${this.idSuffix}`;
  }
}
