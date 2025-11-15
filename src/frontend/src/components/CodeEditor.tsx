import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

type CodeEditorProps = {
  code: string;
  onChange: (value: string) => void;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  // Callback for when the editor's content changes
  const handleChange = (value: string) => {
    onChange(value);
  };

  return (
    <CodeMirror
      value={code}
      onChange={handleChange}
      // Use the VS Code dark theme, a close match to vscDarkPlus
      theme={vscodeDark}
      // Enable the C++ language extension
      extensions={[cpp()]}
      // This style matches your CodeViewer's container
      style={{
        width: "100%",
        height: "100%",
        fontSize: "0.9rem",
        borderRadius: "8px",
        border: "1px solid #444",
        overflow: "hidden", // The editor handles its own scrolling
      }}
    />
  );
};

export default CodeEditor;
