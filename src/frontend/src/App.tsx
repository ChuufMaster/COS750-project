import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import axios from "axios";
import Playground from "./pages/Playground/Playground";
import Quiz from "./pages/Quiz/Quiz";
import UML from "./pages/UML/UML";

function App() {
  return (
    <>
      <div>
        {/* <nav style={{ padding: "1rem", background: "#333", color: "#fff" }}>
          <Link to="/" style={{ marginRight: "1rem", color: "#fff" }}>
            Playground
          </Link>
          <Link to="/quiz" style={{ marginRight: "1rem", color: "#fff" }}>
            Quiz
          </Link>
          <Link to="/uml" style={{ marginRight: "1rem", color: "#fff" }}>
            UML
          </Link>
        </nav> */}
        <div style={{ padding: "1rem" }}>
          <Routes>
            <Route path="/playground" element={<Playground />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/uml" element={<UML />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

//   <a href="https://vite.dev" target="_blank">
//     <img src={viteLogo} className="logo" alt="Vite logo" />
//   </a>
//   <a href="https://react.dev" target="_blank">
//     <img src={reactLogo} className="logo react" alt="React logo" />
//   </a>
// </div>
// <h1>Vite + React</h1>
// <div className="card">
//   <button onClick={() => setCount((count) => count + 1)}>
//     count is {count}
//   </button>
//   <p>
//     Edit <code>src/App.tsx</code> and save to test HMR
//   </p>
// </div>
// <p className="read-the-docs">
//   Click on the Vite and React logos to learn more
// </p>
// <div>
//   <CodeEditor code={code} setCode={setCode} />
//   <button onClick={runCode}>Run Code</button>

export default App;
