import React from "react";
import CodeViewer from "../../components/CodeViewer";
import ApollonUmlEditor from "../../components/UMLEditor";
import "./UML.css";

import { factoryMethodCode } from "./uml.mocks"; // Adjust path if needed

const UML: React.FC = () => {
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
    </main>
  );
};

export default UML;
