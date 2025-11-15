#include <gtest/gtest.h>
#include <string>

// See note in test_traits.cpp about includes.
// #include "factory.hpp"

TEST(Behavior, FactoryMethodReturnsProductPointer) {
    ConcreteCreatorA cc;
    Product* p = cc.FactoryMethod();
    ASSERT_NE(p, nullptr) << "FactoryMethod must return a valid Product*";
    delete p; // Student used raw pointer in the teaching example
}

TEST(Behavior, OperationIsOverriddenAndNonEmpty) {
    ConcreteProductA cpa;
    std::string s = cpa.Operation();
    EXPECT_FALSE(s.empty()) << "Operation() should return a non-empty identifier (e.g., \"A\").";
}

TEST(Behavior, DoSomethingUsesFactoryMethodAndOperation) {
    ConcreteCreatorA cc;
    std::string r = cc.DoSomething();
    // Be flexible: just require it to contain the product Operation() result (commonly "A")
    // You can tighten this if you publish an exact expected string in rubric.
    EXPECT_NE(r.find("A"), std::string::npos)
        << "DoSomething() should incorporate the Product::Operation() result.";
}
