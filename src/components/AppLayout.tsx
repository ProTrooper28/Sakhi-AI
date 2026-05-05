import { type ReactNode } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="page-with-sidebar">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      {/* Mobile only */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;
