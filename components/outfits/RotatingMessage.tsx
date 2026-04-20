"use client";

import { useState, useEffect } from "react";

export default function RotatingMessage({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 200);
    }, 1800);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <p
      className="text-[12px] text-slate-400 text-center mt-4"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
    >
      {messages[index]}
    </p>
  );
}
