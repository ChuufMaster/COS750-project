#pragma once
#include "Product.hpp"

class Creator {
public:
    virtual ~Creator() = default;
    virtual Product* factoryMethod() const = 0;

    std::string someOperation() const {
        Product* p = factoryMethod();
        std::string result = p->operation();
        delete p;
        return result;
    }
};
