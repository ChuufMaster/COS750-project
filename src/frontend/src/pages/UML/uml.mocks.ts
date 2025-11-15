// 1. Mock C++ Code
export const factoryMethodCode = `#include <iostream>
#include <memory>

// Product interface
class Product {
public:
    virtual ~Product() = default;
    virtual void operation() const = 0;
};

// Concrete product
class ConcreteProductA : public Product {
public:
    void operation() const override {
        std::cout << "ConcreteProductA operation\\n";
    }
};

// Creator base class
class Creator {
public:
    virtual ~Creator() = default;
    virtual std::unique_ptr<Product> createProduct() const = 0;

    void doWork() const {
        auto product = createProduct();
        product->operation();
    }
};

// Concrete creator
class ConcreteCreatorA : public Creator {
public:
    std::unique_ptr<Product> createProduct() const override {
        return std::make_unique<ConcreteProductA>();
    }
};

int main() {
    ConcreteCreatorA creator;
    creator.doWork();
    return 0;
}
`;

// 2. Mock UML Diagram Model
export const factoryMethodUML = {
  version: "3.0.0",
  type: "ClassDiagram",
  elements: [
    {
      id: "cf11f427-b080-4614-b121-6a2c26f00eef",
      name: "Creator",
      type: "ClassAbstract",
      bounds: { x: 50, y: 50, width: 180, height: 100 },
      attributes: [],
      methods: ["+ createProduct(): Product"],
    },
    {
      id: "78f7f26f-f279-4a94-b152-164e03f1deda",
      name: "ConcreteCreatorA",
      type: "Class",
      bounds: { x: 50, y: 200, width: 180, height: 100 },
      attributes: [],
      methods: ["+ createProduct(): Product"],
    },
    {
      id: "f1a1f030-cb64-4e4b-b0b3-f01837016d00",
      name: "Product",
      type: "ClassInterface",
      bounds: { x: 300, y: 50, width: 180, height: 80 },
      attributes: [],
      methods: ["+ operation()"],
    },
    {
      id: "2708b731-155e-41d3-9f87-73d9d30a84e4",
      name: "ConcreteProductA",
      type: "Class",
      bounds: { x: 300, y: 200, width: 180, height: 80 },
      attributes: [],
      methods: ["+ operation()"],
    },
  ],
  relationships: [
    {
      id: "b4c107e3-0c1a-466d-8e50-7053e1a0b3e5",
      type: "ClassGeneralization",
      source: {
        element: "78f7f26f-f279-4a94-b152-164e03f1deda",
        direction: "Top",
      },
      target: {
        element: "cf11f427-b080-4614-b121-6a2c26f00eef",
        direction: "Bottom",
      },
    },
    {
      id: "8f7b59e5-6b5d-4f0e-b87c-7d9a8e0f1d1d",
      type: "ClassRealization",
      source: {
        element: "2708b731-155e-41d3-9f87-73d9d30a84e4",
        direction: "Top",
      },
      target: {
        element: "f1a1f030-cb64-4e4b-b0b3-f01837016d00",
        direction: "Bottom",
      },
    },
  ],
};
