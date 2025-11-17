#pragma once
#include <iostream>

class Product {
public:
    virtual ~Product() = default;
    virtual void use() = 0;
};

class ConcreteProductA : public Product {
public:
    void use() override { std::cout << "A\n"; }
};

class ConcreteProductB : public Product {
public:
    void use() override { std::cout << "B\n"; }
};

class Creator {
public:
    virtual ~Creator() = default;
    virtual Product* create() = 0;
};

class ConcreteCreatorA : public Creator {
public:
    Product* create() override {
        return new ConcreteProductA();
    }
};

class ConcreteCreatorB : public Creator {
public:
    Product* create() override {
        return new ConcreteProductB();
    }
};
