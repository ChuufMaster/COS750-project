import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type CodeViewerProps = {
  code: string;
  language?: string; // e.g. "cpp", "tsx", "javascript", etc.
  height?: number | string;
};

const baseContainerStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
};

const baseCodeBlockStyle: React.CSSProperties = {
  margin: 0,
  width: "100%",
  height: "100%",
  overflow: "scroll", // <— always show scrollbars (browser permitting)
  fontSize: "0.9rem",
  borderRadius: "8px",
  border: "2px solid #ffffffff",
  boxSizing: "border-box",
};

const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = "cpp",
  height,
}) => {
  const resolvedHeight =
    typeof height === "number" ? `${height}px` : height ?? "100%";
  return (
    <div style={{ ...baseContainerStyle, height: resolvedHeight }}>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ ...baseCodeBlockStyle, height: "100%" }}
        wrapLongLines
        showLineNumbers
        lineNumberStyle={{ opacity: 0.5 }}
      >
        {code.trimEnd()}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeViewer;
