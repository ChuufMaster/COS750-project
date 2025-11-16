// apollon

declare module "@ls1intum/apollon";
// declare module "@ls1intum/apollon/lib/es6";
// declare module "@ls1intum/apollon/lib/es5";

//syntax highlighter
declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  // you can tighten this later if you care; `any` is fine for theme objects
  export const vscDarkPlus: any;
}

declare module "react-syntax-highlighter" {
  export const Prism: any;
  export const syntaxHighlighter: any;
}
