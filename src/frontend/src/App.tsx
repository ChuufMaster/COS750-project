// src/App.tsx
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Playground from "./pages/Playground/Playground";
import Quiz from "./pages/Quiz/Quiz";
import UML from "./pages/UML/UML";
import Home from "./pages/Home/Home";
import FM from "./pages/FMWalkthrough/FM";
import Admin from "./pages/Admin/Admin";
import MicroQuizRunner from "./pages/Quiz/MicroQuizRunner"; // <-- NEW

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/factorymethod" element={<FM />} />
        <Route path="/admin" element={<Admin />} />
        {/* micro-quiz selection + runner */}
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/quiz/:mqId" element={<MicroQuizRunner />} />
        {/* legacy / dev routes */}
        <Route path="/playground" element={<Playground />} />
        <Route path="/uml" element={<UML />} />
      </Routes>
    </>
  );
}

export default App;
