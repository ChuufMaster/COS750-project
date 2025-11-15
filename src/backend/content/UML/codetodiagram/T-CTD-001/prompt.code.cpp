// Minimal Factory Method example (C++)
#include <string>
#include <memory>

// Product interface
struct Product {
    virtual ~Product() = default;
    virtual std::string Operation() const = 0;
};

// Concrete product
struct ConcreteProductA : Product {
    std::string Operation() const override { return "A"; }
};

// Creator interface
struct Creator {
    virtual ~Creator() = default;
    virtual Product* FactoryMethod() const = 0;

    std::string DoSomething() const {
        Product* p = FactoryMethod();
        std::string r = "Creator: working with -> " + p->Operation();
        delete p; // raw pointer for teaching purposes
        return r;
    }
};

// Concrete creator
struct ConcreteCreatorA : Creator {
    Product* FactoryMethod() const override { return new ConcreteProductA(); }
};
