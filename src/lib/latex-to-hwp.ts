export function latexToHwp(latex: string): string {
  return latex
    .replace(/\\text\{([^}]+)\}/g, "roman{$1}")
    .replace(/\\mathrm\{([^}]+)\}/g, "roman{$1}")
    .replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g, "{$1 over $2}")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "{$1 over $2}")
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt{$1}")
    .replace(/\\sqrt\s/g, "sqrt ")
    .replace(/\\times/g, "times")
    .replace(/\\cdot/g, "cdot")
    .replace(/\\div/g, "div")
    .replace(/\\pm/g, "pm")
    .replace(/\\mp/g, "mp")
    .replace(/\\leq/g, "<=")
    .replace(/\\geq/g, ">=")
    .replace(/\\neq/g, "!=")
    .replace(/\\left\(/g, "(")
    .replace(/\\right\)/g, ")")
    .replace(/\\left\[/g, "[")
    .replace(/\\right\]/g, "]")
    .replace(/\\left\|/g, "|")
    .replace(/\\right\|/g, "|")
    .replace(/\\infty/g, "inf")
    .replace(/\\alpha/g, "alpha")
    .replace(/\\beta/g, "beta")
    .replace(/\\gamma/g, "gamma")
    .replace(/\\delta/g, "delta")
    .replace(/\\pi/g, "pi")
    .replace(/\\square/g, "□")
    .replace(/\\triangle/g, "△")
    .replace(/\\/g, "")
    .replace(/(\w)\^\{([^}]+)\}/g, "$1 ^{$2}")
    .replace(/(\w)\^(\w)/g, "$1 ^{$2}")
    .replace(/(\w)_\{([^}]+)\}/g, "$1 _{$2}")
    .replace(/(\w)_(\w)/g, "$1 _{$2}")
    .trim();
}

export function convertLatexInText(text: string): string {
  return text
    .replace(/\$\$([^$]+)\$\$/g, (_, inner) => latexToHwp(inner))
    .replace(/\$([^$]+)\$/g, (_, inner) => latexToHwp(inner));
}
