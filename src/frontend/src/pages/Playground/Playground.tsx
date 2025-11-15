import React, { useState } from "react";
import CodeEditor from "../../CodeEditor";
import axios from "axios";

const Playground: React.FC = () => {
  const [code, setCode] = useState(`
#include <iostream>
int main() {
    std::cout << "Hello";
    return 0;
}
`);
  const [output, setOutput] = useState<{
    compile_errors?: string;
    runtime_output?: string;
    test_results?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const runCode = async () => {
    setLoading(true);
    setOutput(null);
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/playground/run",
        { code },
      );
      setOutput(response.data);
    } catch (err) {
      setOutput({ compile_errors: (err as any).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Playground</h1>
      <CodeEditor code={code} setCode={setCode} />
      <button
        onClick={runCode}
        style={{ marginTop: "1rem" }}
        disabled={loading}
      >
        {loading ? "Runnning..." : "Run Code"}
      </button>

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
              {output.compile_errors}
              <br />
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
