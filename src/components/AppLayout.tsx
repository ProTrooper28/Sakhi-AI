import { type ReactNode } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="page-with-sidebar">
      <Sidebar />
      <main className="main-content">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </main>
      {/* Mobile only */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;
