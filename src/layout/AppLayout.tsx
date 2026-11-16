import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen w-full overflow-x-hidden flex flex-col xl:flex-row">
      <div className="w-full xl:w-auto">
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 min-w-0 overflow-x-hidden transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[270px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="px-1 py-2 sm:px-1.5 sm:py-2.5 w-full max-w-full min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
