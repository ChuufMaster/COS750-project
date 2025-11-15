import React, { useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";

type CodeEditorProps = {
  code: string;
  setCode: (code: string) => void;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <Editor
      height="400px"
      defaultLanguage="cpp"
      defaultValue={code}
      theme="vs-dark"
      onChange={(value) => setCode(value || "")}
      onMount={handleEditorDidMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
      }}
    />
  );
};

export default CodeEditor;
