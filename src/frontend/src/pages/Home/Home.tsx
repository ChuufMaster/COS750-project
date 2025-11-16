import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <main
      className="full-width"
      style={{
        minHeight: "100vh",
        padding: "32px 0",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <section
        style={{
          fontSize: "1.8rem",
          fontWeight: 600,
          marginBottom: "4px",
        }}
      >
        COS 214 APP
      </section>

      <section
        style={{
          maxWidth: "720px",
          textAlign: "center",
          fontSize: "0.95rem",
          lineHeight: 1.5,
          opacity: 0.9,
          marginBottom: "8px",
        }}
      >
        A guided practice environment for COS 214 design patterns.
      </section>

      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          flexDirection: "column",
          gap: "12px",
          justifyContent: "center",
          marginTop: "8px",
        }}
      >
        <Link
          to="/admin"
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            border: "1px solid #374151",
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          Admin Panel
        </Link>

        <Link
          to="/factorymethod"
          style={{
            padding: "8px 18px",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "0.95rem",
            fontWeight: 500,
          }}
        >
          Factory Method
        </Link>
      </section>
    </main>
  );
};

export default Home;
