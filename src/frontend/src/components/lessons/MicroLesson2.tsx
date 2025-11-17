import React from "react";
import CodeViewer from "../CodeViewer";

const MicroLesson2: React.FC = () => {
  return (
    <section
      style={{
        borderRadius: 12,
        margin: "16px auto",
        padding: "16px",
        maxWidth: "960px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1f2937",
        color: "white",
        gap: 12,
      }}
    >
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
          Lesson 2 – C++ Coding Concepts Behind Factory Method
        </h2>

        <p style={{ margin: 0 }}>
          To implement the <strong>Factory Method</strong> pattern cleanly in
          C++, you need to be comfortable with <strong>constructors</strong>,{" "}
          <strong>destructors</strong>, <strong>virtual destructors</strong>,
          and <strong>base-class initialisation</strong>. These concepts ensure
          that objects are created and destroyed safely when using inheritance.
        </p>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
          Constructors & member initialisation
        </h3>
        <p style={{ margin: 0 }}>
          A constructor is a special member function with the same name as the
          class, used to initialise attributes and perform setup. In C++, it is
          good practice to use the <strong>member initialiser list</strong> to
          initialise fields and to call the{" "}
          <strong>base-class constructor</strong>.
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
    Product(const std::string& name)
        : name(name) {}   // member initialiser list

    virtual ~Product() = default;

    virtual void use() = 0;

protected:
    std::string name;
};

class ConcreteProductA : public Product {
public:
    ConcreteProductA()
        : Product("A") {} // calls base constructor

    void use() override {
        // behaviour for product A
    }
};`}
          />
        </div>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
          Destructors & virtual destructors
        </h3>
        <p style={{ margin: 0 }}>
          When you delete a derived object through a <code>Product*</code>{" "}
          pointer, the base class needs a <strong>virtual destructor</strong> so
          that the <strong>correct</strong> destructor chain runs. This is
          especially important when a Factory Method returns base-class
          pointers.
        </p>

        <p style={{ margin: 0 }}>
          If <code>Product</code> had a non-virtual destructor and you wrote{" "}
          <code>delete product;</code> via a <code>Product*</code>, only the{" "}
          <em>base</em> destructor would run, leaking resources owned by the
          derived class.
        </p>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
          Creator, factory method & lifetime
        </h3>
        <p style={{ margin: 0 }}>
          In C++, the <strong>Creator</strong> hierarchy often returns raw
          pointers (like <code>Product*</code>) in the factory method. That
          means the <strong>client</strong> code is responsible for calling{" "}
          <code>delete</code> when it is done. A minimal example:
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
            code={`class Creator {
public:
    virtual ~Creator() = default;
    // factory method
    virtual Product* create() const = 0;
};

class ConcreteCreatorA : public Creator {
public:
    Product* create() const override {
        return new ConcreteProductA();
    }
};

void clientCode(const Creator& creator) {
    Product* p = creator.create(); // factory method
    p->use();
    delete p; // client responsible for cleanup
}`}
          />
        </div>

        <p style={{ margin: 0 }}>
          In real code, you might prefer{" "}
          <code>std::unique_ptr&lt;Product&gt;</code> to manage ownership
          automatically, but the same principle applies: the factory method
          hides which concrete product is created, while still giving the client
          a usable interface.
        </p>

        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
          Key takeaways for implementation
        </h3>
        <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>
          <li>
            Use <strong>member initialiser lists</strong> to initialise
            attributes and call base constructors.
          </li>
          <li>
            Make base classes like <code>Product</code> and <code>Creator</code>{" "}
            have <strong>virtual destructors</strong> when used polymorphically.
          </li>
          <li>
            Ensure the factory method returns a{" "}
            <strong>polymorphic type</strong> (usually a pointer or smart
            pointer to the base class).
          </li>
          <li>
            Decide clearly who owns the created object (client vs. creator) and
            clean up consistently.
          </li>
        </ul>

        <p style={{ margin: 0 }}>
          In the next steps, you&apos;ll apply these concepts when reading UML,
          implementing C++ code, and checking that your Factory Method design is
          both
          <strong>conceptually</strong> and <strong>technically</strong>{" "}
          correct.
        </p>
      </section>
  );
};
export default MicroLesson2;
