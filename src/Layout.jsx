import React from "react";
import BottomTabBar from "@/components/BottomTabBar";
import { useTheme } from "@/lib/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import BackButton from "@/components/BackButton";

export default function Layout({ children }) {
  const { isDark } = useTheme();
  const location = useLocation();
  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto px-5 pt-3 pb-1">
            <BackButton />
          </div>
          {children}
        </motion.div>
      </AnimatePresence>
      {/* Removed non-functional page indicator dots */}
      <BottomTabBar />
    </div>
  );
}