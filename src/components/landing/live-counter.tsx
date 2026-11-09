"use client";

import { useEffect, useState } from "react";

/** Ticks up slowly from `start`, like a live feed of new shopping lists. */
export function LiveCounter({ start }: { start: number }) {
  const [value, setValue] = useState(start);

  useEffect(() => {
    const id = setInterval(() => setValue((v) => v + 1 + Math.floor(Math.random() * 3)), 1100);
    return () => clearInterval(id);
  }, []);

  return <span className="tabular">{value.toLocaleString("pt-BR")}</span>;
}
