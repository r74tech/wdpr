import temml from "temml";

export function renderLatexToMathML(latex: string, displayMode: boolean): string {
  try {
    let processedLatex = latex;
    if (displayMode && needsAlignedWrapper(latex)) {
      processedLatex = `\\begin{aligned}\n${latex}\n\\end{aligned}`;
    }

    return temml.renderToString(processedLatex, {
      displayMode,
      throwOnError: false,
      annotate: false,
    });
  } catch {
    return "";
  }
}

function needsAlignedWrapper(latex: string): boolean {
  if (/\\begin\s*\{/.test(latex)) {
    return false;
  }

  const withoutEscaped = latex.replace(/\\&/g, "");
  return withoutEscaped.includes("&");
}
