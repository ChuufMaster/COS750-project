#pragma once
#include "Creator.hpp"
#include "ConcreteProductA.hpp"

class ConcreteCreatorA : public Creator {
public:
    Product* factoryMethod() const override { return new ConcreteProductA(); }
};
