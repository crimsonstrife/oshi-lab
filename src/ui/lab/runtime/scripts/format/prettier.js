// @ts-check
import prettier from "prettier/standalone";
import htmlPlugin from "prettier/plugins/html";
import postcssPlugin from "prettier/plugins/postcss";

/**
 * @param {string} html
 */
export async function formatHtml(html) {
  return prettier.format(html ?? "", {
    parser: "html",
    plugins: [htmlPlugin],
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
  });
}

/**
 * @param {string} css
 */
export async function formatCss(css) {
  return prettier.format(css ?? "", {
    parser: "css",
    plugins: [postcssPlugin],
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
  });
}
