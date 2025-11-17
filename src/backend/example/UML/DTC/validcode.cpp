class Product {
public:
    virtual void use() { }
};

class ConcreteProductA : public Product {
public:
    void use() { }
};

class ConcreteProductB : public Product {
public:
    void use() { }
};

class Creator {
public:
    virtual Product* create() { return nullptr; }
};

class ConcreteCreatorA : public Creator {
public:
    Product* create() { return new ConcreteProductA(); }
};

class ConcreteCreatorB : public Creator {
public:
    Product* create() { return new ConcreteProductB(); }
};
