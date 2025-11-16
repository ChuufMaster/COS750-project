import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <main>
      <section> COS 214 APP</section>
      <section> App description</section>
      <section>
        <Link to="/admin">Admin</Link>
        <Link to="/memento">Memento</Link>
        <Link to="/templatemethod">Template Method</Link>
        <Link to="/factorymethod">Factory method</Link>
      </section>
    </main>
  );
};

export default Home;
