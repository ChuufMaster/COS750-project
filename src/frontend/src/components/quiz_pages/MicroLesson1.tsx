import React from "react";
import CodeViewer from "../CodeViewer";

type MicroLesson1Props = {
  handleProceed: () => void;
};

const MicroLesson1: React.FC<MicroLesson1Props> = ({ handleProceed }) => {
  return (
    <main
      className="full-width"
      style={{
        padding: "24px 0px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#242424",
          padding: "16px 0",
          borderBottom: "2px solid #333",
        }}
      >
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            maxWidth: "1200px",
            minWidth: "1200px",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
            Factory Method - Lesson 1
          </h1>
          {/* enable when results are submitted */}
          <button
            type="button"
            onClick={handleProceed}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Proceed ➜
          </button>
        </section>
      </header>
      {/* Main lesson content */}
      <section
        style={{
          borderRadius: 12,
          margin: "16px 200px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#1f2937",
          color: "white",
          gap: 12,
        }}
      >
        <p style={{ margin: 0 }}>
          The <strong>Factory Method</strong> pattern provides a way to create
          objects without hard-coding concrete classes in client code. Instead
          of calling
          <code> new ConcreteProduct()</code> directly, a client calls a{" "}
          <strong>factory method</strong> on a creator object, and a subclass
          decides which specific product to instantiate.
        </p>

        <p style={{ margin: 0 }}>
          This pattern addresses the problem of <strong>tight coupling</strong>{" "}
          between code that creates objects and the concrete classes of those
          objects. By delegating object creation to subclasses, it becomes
          easier to <strong>extend</strong> the system with new product types
          and keep client code stable.
        </p>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Core intent</h3>
        <p style={{ margin: 0 }}>
          Provide an interface for creating an object, but let subclasses decide
          which concrete class to instantiate. The creator defines a factory
          method that returns a product interface; concrete creators override
          this method to construct specific products.
        </p>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Pattern participants</h3>
        <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
          <li>
            <strong>Product</strong> – abstract interface for objects created by
            the factory method.
          </li>
          <li>
            <strong>ConcreteProduct</strong> – implements the{" "}
            <code>Product</code> interface (for example:{" "}
            <code>ConcreteProductA</code>, <code>ConcreteProductB</code>).
          </li>
          <li>
            <strong>Creator</strong> – declares the{" "}
            <strong>factory method</strong>, typically returning a{" "}
            <code>Product*</code>. The creator may provide a default
            implementation.
          </li>
          <li>
            <strong>ConcreteCreator</strong> – overrides the factory method to
            return a particular <code>ConcreteProduct</code>.
          </li>
        </ul>

        <p style={{ margin: 0 }}>
          This leads to <strong>parallel hierarchies</strong>: a creator
          hierarchy (<code>Creator</code>, <code>ConcreteCreatorA</code>,{" "}
          <code>ConcreteCreatorB</code>) and a product hierarchy (
          <code>Product</code>, <code>ConcreteProductA</code>,{" "}
          <code>ConcreteProductB</code>). At the concrete level a{" "}
          <code>ConcreteCreator</code> is tied to a matching{" "}
          <code>ConcreteProduct</code>.
        </p>

        <p style={{ margin: 0 }}>
          The snippet below shows a minimal C++ version of this structure: a{" "}
          <code>Product</code> interface, two concrete products, a{" "}
          <code>Creator</code> with a virtual factory method, and concrete
          creators that decide which product to create.
        </p>

        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #111827",
          }}
        >
          <CodeViewer
            language="cpp"
            code={`class Product {
public:
    virtual ~Product() {}
    virtual void use() = 0;
};

class ConcreteProductA : public Product {
public:
    void use() override {/* ... */ }
};

class ConcreteProductB : public Product {
public:
    void use() override {/* ... */ }
};

class Creator {
public:
    virtual ~Creator() {}
    // Factory Method
    virtual Product* create() const = 0;
};

class ConcreteCreatorA : public Creator {
public:
    Product* create() const override {
        return new ConcreteProductA();
    }
};

class ConcreteCreatorB : public Creator {
public:
    Product* create() const override {
        return new ConcreteProductB();
    }
};`}
          />
        </div>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Benefits</h3>
        <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
          <li>
            <strong>Reduced coupling</strong> – clients depend on abstract{" "}
            <code>Product</code>/<code>Creator</code> types, not specific
            classes.
          </li>
          <li>
            <strong>Easier extension</strong> – to add a new product, you
            typically add a new <code>ConcreteCreator</code> and{" "}
            <code>ConcreteProduct</code> with minimal changes to client code.
          </li>
          <li>
            <strong>Centralised object creation</strong> – all construction
            logic is in the factory method, making it easier to control
            lifetimes, logging, or resource management.
          </li>
        </ul>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
          Common misconceptions
        </h3>
        <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
          <li>
            Simply wrapping <code>new</code> in a helper function does{" "}
            <strong>not</strong> automatically mean you are using Factory
            Method. The pattern requires a <strong>creator hierarchy</strong>, a{" "}
            <strong>product hierarchy</strong>, and an overridable factory
            method that subclasses specialise.
          </li>
          <li>
            Factory methods do <strong>not</strong> have to be static. They are
            often <strong>virtual instance methods</strong> on the creator so
            that each subclass can override the creation behaviour.
          </li>
        </ul>

        <h3 style={{ margin: 0 }}>
          In the upcoming activities, you&apos;ll use this theory to recognise
          Factory Method structures in UML and map them to C++ code.
        </h3>
      </section>
    </main>
  );
};

export default MicroLesson1;
