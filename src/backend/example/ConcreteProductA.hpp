#pragma once
#include "Product.hpp"

class ConcreteProductA : public Product {
public:
    std::string operation() const override { return "Result of ConcreteProductA"; }
};

