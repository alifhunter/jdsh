"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string;
  onDone: () => void;
};

export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, onDone]);

  return (
    <div className="fixed right-4 top-4 z-50 rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-medium text-brand-900 shadow-lg">
      {message}
    </div>
  );
}
