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
      {/* <div> */}
      <Routes>
        <Route path="/playground" element={<Playground />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/uml" element={<UML />} />
      </Routes>
      {/* </div> */}
    </>
  );
}

export default App;
