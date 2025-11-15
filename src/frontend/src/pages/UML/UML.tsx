import React, { useState } from "react";
import CodeViewer from "../../components/CodeViewer";
import ApollonUmlEditor from "../../components/UMLEditor";
import CodeEditor from "../../components/CodeEditor";
import "./UML.css";

import { factoryMethodCode, factoryMethodUML } from "./uml.mocks";

const UML: React.FC = () => {
  const [task2Code, setTask2Code] = useState(
    "// Implement the code based on the diagram..."
  );

  return (
    <main>
      <h1 className="title">UML</h1>
      <p className="task1-desc">Task 1: Code to Diagram</p>
      <div className="top-wrapper">
        <div className="code-wrapper">
          <CodeViewer code={factoryMethodCode} language="cpp" />
        </div>
        <div className="uml-wrapper">
          <ApollonUmlEditor />
        </div>
        <div className="submit-wrapper">
          <div className="description">Description:</div>
          <div className="feedback">Feedback:</div>
          <button className="submit" onClick={() => {}}>
            Submit
          </button>
        </div>
      </div>
      <p className="task1-desc">Task 2: Diagram to Code</p>
      <div className="bottom-wrapper">
        <div className="uml-wrapper">
          <ApollonUmlEditor initialModel={factoryMethodUML} readOnly={true} />
        </div>
        <div className="code-wrapper">
          <CodeEditor code={task2Code} onChange={setTask2Code} />
        </div>
        <div className="submit-wrapper">
          <div className="description">Description:</div>
          <div className="feedback">Feedback:</div>
          <button className="submit" onClick={() => {}}>
            Submit
          </button>
        </div>
      </div>
    </main>
  );
};

export default UML;
