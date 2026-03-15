import { Link } from "react-router-dom";
import NeoPage from "../components/NeoPage";

const NotFoundPage = () => (
  <NeoPage>
    <section className="container mx-auto px-6 py-24 text-center space-y-6">
      <p className="text-xs font-heavy uppercase tracking-[0.4em] text-neo-main">404</p>
      <h1 className="text-6xl font-display font-extrabold text-neo-black">Page not found</h1>
      <p className="text-xl text-gray-700">Page not found. Return to home and select the section you need.</p>
      <Link to="/" className="btn-neo-main inline-block">
        Go home
      </Link>
    </section>
  </NeoPage>
);

export default NotFoundPage;


