#pragma once
#include "Product.hpp"

class ConcreteProductB : public Product {
public:
    std::string operation() const override { return "Result of ConcreteProductB"; }
};
