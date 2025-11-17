CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
TARGET = factory
SOURCES = main.cpp
HEADERS = Product.hpp ConcreteProductA.hpp ConcreteProductB.hpp Creator.hpp ConcreteCreatorA.hpp ConcreteCreatorB.hpp

all: $(TARGET)

$(TARGET): $(SOURCES) $(HEADERS)
	$(CXX) $(CXXFLAGS) $(SOURCES) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
