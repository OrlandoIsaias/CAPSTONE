import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function BotonVolver() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Volver"
      className="fixed top-4 left-4 z-50 w-11 h-11 rounded-full bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-md flex items-center justify-center hover:brightness-95 transition"
    >
      <ChevronLeft size={22} strokeWidth={2.2} />
    </button>
  );
}
