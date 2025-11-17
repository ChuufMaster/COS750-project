#pragma once
#include "Creator.hpp"
#include "ConcreteProductB.hpp"

class ConcreteCreatorB : public Creator {
public:
    Product* factoryMethod() const override { return new ConcreteProductB(); }
};
