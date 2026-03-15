import { useEffect } from "react";

const INTERACTIVE_SELECTOR = "a, button, input, textarea, select, [data-cursor='link']";

export const useNeoCursor = () => {
  useEffect(() => {
    const cursor = document.getElementById("cursor");
    if (!cursor) return undefined;

    const moveHandler = (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    };

    const overHandler = (event) => {
      if (event.target.closest(INTERACTIVE_SELECTOR)) {
        cursor.classList.add("hovered");
      }
    };

    const outHandler = (event) => {
      if (event.target.closest(INTERACTIVE_SELECTOR)) {
        cursor.classList.remove("hovered");
      }
    };

    document.addEventListener("mousemove", moveHandler);
    document.addEventListener("mouseover", overHandler);
    document.addEventListener("mouseout", outHandler);

    return () => {
      document.removeEventListener("mousemove", moveHandler);
      document.removeEventListener("mouseover", overHandler);
      document.removeEventListener("mouseout", outHandler);
    };
  }, []);
};










