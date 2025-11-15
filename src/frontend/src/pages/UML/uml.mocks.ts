// We export the code string so other files can import it.
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
