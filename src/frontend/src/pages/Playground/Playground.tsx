import React, { useState } from "react";
import CodeEditor from "../../CodeEditor";
import JSZip from "jszip";
import fileSaver from "file-saver";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_URL } from "../../config";

type ErrorType = {
  errors: [
    {
      error: string;
      file: string;
      feedback: string;
    },
  ];
};

const Playground: React.FC = () => {
  const [code, setCode] = useState({});
  const [output, setOutput] = useState<{
    compile_errors: [{ error: string; file: string; feedback: string }];
    runtime_output?: string;
    test_results?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const runCode = async () => {
    setLoading(true);
    setOutput(null);
    try {
      const response = await axios.post(`${API_URL}/playground/run`, code);
      setOutput(response.data);
    } catch (err) {
      setOutput({ compile_errors: (err as any).message });
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async (code: Record<string, string>) => {
    const zip = new JSZip();
    for (const [filename, content] of Object.entries(code)) {
      zip.file(filename, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    fileSaver.saveAs(blob, "project.zip");
  };

  const ErrorList = ({ errors }: ErrorType) =>
    errors.map((error) => (
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          gap: "1rem",
        }}
      >
        <div
          style={{
            flex: 1,
            whiteSpace: "pre-wrap",
            background: "#bf4537",
            color: "#d4d4d4",
            padding: "1rem",
            borderRadius: "4px",
          }}
        >
          <strong>Error in: {error.file}</strong>
          <br />
          {error.error}
        </div>

        <div
          style={{
            flex: 1,
            whiteSpace: "pre-wrap",
            background: "#3b5f2b",
            color: "#d4d4d4",
            padding: "1rem",
            borderRadius: "4px",
          }}
        >
          <strong>Feedback</strong>
          <br />
          {error.feedback}
        </div>
      </div>
    ));

  return (
    <div>
      <div style={{ display: "flex" }}>
        <h1>Playground</h1>
        <Link
          to="/"
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "0.95rem",
            fontWeight: 500,
            height: "50%",
            margin: "auto",
          }}
        >
          Home
        </Link>
      </div>
      <CodeEditor code={code} setCode={setCode} />
      <button
        onClick={runCode}
        style={{ marginTop: "1rem" }}
        disabled={loading}
      >
        {loading ? "Runnning..." : "Run Code"}
      </button>
      <button onClick={() => downloadZip(code)}>Download ZIP</button>

      {output && (
        <div
          style={{
            marginTop: "1rem",
            whiteSpace: "pre-wrap",
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: "1rem",
            borderRadius: "4px",
          }}
        >
          {output.compile_errors && (
            <div>
              <strong>Compile Errors:</strong>
              <br />
              <ErrorList errors={output.compile_errors} />
            </div>
          )}
          {output.runtime_output && (
            <div>
              <strong>Runtime Output:</strong>
              <br />
              {output.runtime_output}
            </div>
          )}
          {output.test_results && (
            <div>
              <strong>Test Results:</strong>
              <br />
              {output.test_results}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Playground;
