#include <iostream>
#include "ConcreteCreatorA.hpp"
#include "ConcreteCreatorB.hpp"

int main() {
    Creator* c1 = new ConcreteCreatorA();
    std::cout << c1->someOperation() << "\n";
    delete c1;

    Creator* c2 = new ConcreteCreatorB();
    std::cout << c2->someOperation() << "\n";
    delete c2;

    return 0;
}
