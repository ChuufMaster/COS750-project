#include <type_traits>
#include <string>

// The student's headers should already be visible in the include path or compiled into the TU.
// If you require a specific header name, e.g., "factory.hpp", include it here:
// #include "factory.hpp"

// Forward declarations are NOT used here because tests should rely on the student's actual definitions.

template <typename T>
constexpr bool is_abstract_v = std::is_abstract<T>::value;

template <typename Base, typename Derived>
constexpr bool is_base_of_v = std::is_base_of<Base, Derived>::value;

#include <gtest/gtest.h>

TEST(Traits, ProductIsAbstract) {
    // If Product isn't abstract, this fails to compile or will be false.
    static_assert(is_abstract_v<Product>, "Product must be abstract (pure virtual Operation).");
    SUCCEED();
}

TEST(Traits, CreatorIsAbstract) {
    static_assert(is_abstract_v<Creator>, "Creator must be abstract (pure virtual FactoryMethod).");
    SUCCEED();
}

TEST(Traits, ConcreteProductAInheritsProduct) {
    static_assert(is_base_of_v<Product, ConcreteProductA>, "ConcreteProductA must inherit Product.");
    SUCCEED();
}

TEST(Traits, ConcreteCreatorAInheritsCreator) {
    static_assert(is_base_of_v<Creator, ConcreteCreatorA>, "ConcreteCreatorA must inherit Creator.");
    SUCCEED();
}
