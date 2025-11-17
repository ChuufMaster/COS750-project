#pragma once
#include <string>

class Product {
public:
    virtual ~Product() = default;
    virtual std::string operation() const = 0;
};

