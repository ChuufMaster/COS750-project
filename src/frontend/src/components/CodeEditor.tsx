import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { EditorView } from "@codemirror/view"; // 1. Import EditorView

// 2. Create a theme extension that sets the background to transparent
const transparentTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent !important",
  },
  ".cm-scroller": {
    backgroundColor: "transparent !important",
  },
  ".cm-content": {
    backgroundColor: "transparent !important",
  },
  ".cm-gutters": {
    backgroundColor: "transparent !important",
    // You might want to make the gutter border transparent too
    borderRight: "1px solid transparent",
  },
  // If you want the line number text to be a different color
  // ".cm-gutterElement": {
  //   color: "#999 !important"
  // }
});

type CodeEditorProps = {
  code: string;
  onChange: (value: string) => void;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  const handleChange = (value: string) => {
    onChange(value);
  };

  return (
    <CodeMirror
      value={code}
      onChange={handleChange}
      theme={vscodeDark} // This provides the syntax highlighting colors
      // 3. Add your new transparent theme to the extensions
      extensions={[cpp(), transparentTheme]}
      style={{
        width: "100%",
        height: "100%",
        fontSize: "0.9rem",
        borderRadius: "8px",
        border: "1px solid #444",
        overflow: "hidden",
      }}
    />
  );
};

export default CodeEditor;
