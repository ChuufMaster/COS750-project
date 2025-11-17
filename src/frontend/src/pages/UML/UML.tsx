import { Link } from "react-router-dom";
import ApollonUmlEditor from "../../components/ApollonUmlEditor";

const UML: React.FC = () => {
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
      }}
    >
      <div className="mq-header-actions">
        <Link to="/" className="mq-link" style={{ paddingLeft: "1rem" }}>
          ← Back to home
        </Link>
      </div>
      <div style={{ flexGrow: 1, padding: "1rem" }}>
        <ApollonUmlEditor />
      </div>
    </main>
  );
};

export default UML;
