import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import axios from "axios";
import Playground from "./pages/Playground/Playground";
import Quiz from "./pages/Quiz/Quiz";
import UML from "./pages/UML/UML";
import Home from "./pages/Home/Home";
import FM from "./pages/FMQuiz/FM";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/factorymethod" element={<FM />} />
        {/* will be removed */}
        <Route path="/playground" element={<Playground />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/uml" element={<UML />} />
      </Routes>
    </>
  );
}

export default App;
