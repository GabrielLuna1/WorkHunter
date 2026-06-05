"use client";

import { motion } from "framer-motion";

export function PageTransition({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
