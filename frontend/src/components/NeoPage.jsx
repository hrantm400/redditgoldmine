import NeoCursor from "./NeoCursor";
import useInteractionSound from "../hooks/useInteractionSound";
import PromoModal from "./PromoModal";

const NeoPage = ({ children }) => {
  useInteractionSound();

  return (
    <div className="min-h-screen bg-neo-bg text-neo-black antialiased">
      <NeoCursor />
      {children}
      <PromoModal />
    </div>
  );
};

export default NeoPage;

