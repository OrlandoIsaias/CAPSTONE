import { useNavigate } from "react-router-dom";

export function BotonVolver() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Volver"
      className="fixed top-4 left-4 z-50 w-11 h-11 rounded-full bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-md flex items-center justify-center hover:brightness-95 transition"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
