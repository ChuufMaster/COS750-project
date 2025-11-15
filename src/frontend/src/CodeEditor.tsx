import React, { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

type CodeEditorProps = {
  code: Record<string, any>;
  setCode: (code: Record<string, any>) => void;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode }) => {
  const [fileName, setFileName] = useState("");

  const [file, setFile] = useState("");
  const [files, setFiles] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/playground/files",
        );
        const loadedFiles = response.data;
        const firstFileName = Object.keys(loadedFiles)[0];
        setFiles(loadedFiles);
        setFileName(firstFileName);
        setFile(loadedFiles[firstFileName]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (fileName && files[fileName]) {
      setFile(files[fileName]);
    }
  }, [fileName, files]);

  if (loading) return <div>Loading...</div>;

  setCode(files);

  return (
    <div>
      {Object.entries(files).map((file_map) => {
        return (
          <button
            key={file_map[0]}
            disabled={fileName === file_map[0]}
            onClick={() => setFileName(file_map[0])}
          >
            {file_map[0]}
          </button>
        );
      })}
      {files && (
        <Editor
          height="400px"
          defaultLanguage="cpp"
          theme="vs-dark"
          onChange={(value) => {
            const updated = {
              ...files,
              [fileName]: value || "",
            };

            setFile(value || "");
            setFiles(updated);
            setCode(updated); // this propagates back to parent
          }}
          path={fileName}
          defaultValue={file}
          value={file}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
          }}
        />
      )}
    </div>
  );
};

export default CodeEditor;
