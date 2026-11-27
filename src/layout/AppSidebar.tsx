import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router";
import { useSelector } from "react-redux";
import { RootState } from "../Redux/store";

// Assume these icons are imported from an icon library
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  // ListIcon,
  PageIcon,
  PieChartIcon,
  TableIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { isIndigoCxUser, shouldHideNpsPartnerDay } from "../utils/partnerAccess";
// import SidebarWidget from "./SidebarWidget";
// import { FaChartLine, FaTable } from "react-icons/fa";
import { FaChartLine } from "react-icons/fa";

const NPS_PARTNER_DAY_PATH = "/dashboard/OtherPage/NPSDayBoard";

type NavItem = {
  id?: string;
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { id?: string; name: string; path: string; pro?: boolean; new?: boolean }[];
};

export const navItems: NavItem[] = [
  {
    id: "A.0",
    name: "Config",
    icon: <PageIcon />,
    subItems: [
      {
        id: "A.1",
        name: "Overview",
        path: "/dashboard/aggregator/overview",
        pro: false,
      },
      {
        id: "A.2",
        name: "Booking links",
        path: "/dashboard/aggregator/bookings",
        pro: false,
      },
      {
        id: "A.3",
        name: "Markup rules",
        path: "/dashboard/aggregator/markup",
        pro: false,
      },
    ],
  },
  {
    id: "1.0",
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
  },

  {
    id: "2.0",
    name: "Analytics",
    icon: <FaChartLine />,
    subItems: [
      {
        id: "2.1",
        name: "Booking Logs",
        path: "/dashboard/analytics/BookingLogs",
        pro: false,
      },
      {
        id: "2.2",
        name: "Cancel Logs",
        path: "/dashboard/analytics/CancelLogs",
        pro: false,
      },
      {
        id: "2.3",
        name: "Conversion Logs",
        path: "/dashboard/analytics/ConversionLogs",
        pro: false,
      },
      {
        id: "2.7",
        name: "SLA Rides",
        path: "/dashboard/analytics/SlaRides",
        pro: false,
      },
      { id: "2.4", name: "Fare Search Report", path: "/dashboard/analytics/FareSearchReport", pro: false },
      { id: "2.10", name: "Fare Search by Ride Type", path: "/dashboard/analytics/FareSearchRideType", pro: false },
      { id: "2.9", name: "Same-day vs Future", path: "/dashboard/analytics/SearchLeadTime", pro: false },
      { id: "2.5", name: "Demand Density Map", path: "/dashboard/analytics/MetroRoutes", pro: false },
      { id: "2.6", name: "Fare Search Booking Funnel", path: "/dashboard/analytics/FareSearchAnalytics", pro: false },
      { id: "2.8", name: "Partner Performance", path: "/dashboard/analytics/PartnerPerformance", pro: false },
    ],
  },
  {
    id: "3.0",
    name: "Chart & Graphs",
    icon: <PieChartIcon />,
    subItems: [
      {
        id: "3.1",
        name: "GMV & Revenue Graphs",
        path: "/dashboard/graphs/gmv",
      },
      {
        id: "3.2",
        name: "Category wise analysis",
        path: "/dashboard/graphs/cab-type",
      },
      {
        id: "3.3",
        name: "Trip wise analysis",
        path: "/dashboard/graphs/trip-type",
      },
    ],
  },

  {
    id: "4.0",
    name: "Customer Care",
    icon: <TableIcon />,
    subItems: [
      { id: "4.1", name: "Home", path: "/dashboard/customerCare/HomeCX", pro: true },
       {
        id: "4.8",
        name: "Customer Logs",
        path: "/dashboard/customerCare/CustomerLogs",
        pro: false,
      },
       {
      id: "4.9",
      name: "Clock-view pickups",
      path: "/dashboard/customerCare/ClockViewPickups",
      pro: false,
    },
  
      {
        id: "4.2",
        name: "All Bookings",
        path: "/dashboard/customerCare/Allbookings",
        pro: false,
      },
      {
        id: "4.3",
        name: "Delay Rides",
        path: "/dashboard/customerCare/Delay_Rides",
        pro: false,
      },
      {
        id: "4.4",
        name: "Active Rides",
        path: "/dashboard/customerCare/ActiveRides",
        pro: false,
      },
      {
        id: "4.5",
        name: "Today All Pickup",
        path: "/dashboard/customerCare/TodayAllPickup",
        pro: false,
      },
      {
        id: "4.6",
        name: "Next 2Hr bookings",
        path: "/dashboard/customerCare/Next2HrBooking",
        pro: false,
      },
      {
        id: "4.7",
        name: "VIP bookings",
        path: "/dashboard/customerCare/VIP_Bookings",
        pro: false,
      },
      {
        id: "4.7",
        name: "VIP desk",
        path: "/dashboard/customerCare/VipDesk",
        pro: false,
      },
      {
        id: "4.71",
        name: "VIP profiles",
        path: "/dashboard/customerCare/VipProfiles",
        pro: false,
      },
      {
        id: "4.72",
        name: "VIP email desk",
        path: "/dashboard/customerCare/VipEmailDesk",
        pro: false,
      },
         {
      id: "5.0",
      name: "Ride Logs",
      path: "/dashboard/customerCare/Ridelogs",
      pro: false,
    },
    
      // { name: "Call Logs", path: "/dashboard/#", pro: false }
    ],
  },
  {
    id: "4.12",
    name: "Operations",
    icon: <PageIcon />,
    subItems: [
      {
        id: "4.13",
        name: "Fare Search",
        path: "/dashboard/customerCare/FareSearch",
        pro: false,
      },
      {
        id: "4.14",
        name: "Booking Logs",
        path: "/dashboard/customerCare/BookingLogs",
        pro: false,
      },
    ],
  },
  
  // {
  //   name: "Analysis",
  //   icon: <PageIcon />,
  //   subItems: [
  //     { name: "Revenue", path: "/comming_soon", pro: false },
  //     { name: "Payment Report", path: "/#", pro: false },
  //   ],
  // },
];

const othersItems: NavItem[] = [
  {
    id: "5.0",
    icon: <PageIcon />,
    name: "Reports",
    subItems: [
      { id: "5.1", name: "Bluechip Error Report", path: "/dashboard/customerCare/CustomBookingReport", pro: false },
      { id: "5.2", name: "NPS Record", path: "/dashboard/OtherPage/NPSRecord", pro: false },
      { id: "5.2", name: "NPS Partner Day", path: "/dashboard/OtherPage/NPSDayBoard", pro: false, new: true },
      { id: "5.3", name: "Remark Record", path: "/dashboard/customerCare/RemarkRecord", pro: false },
      { id: "5.4", name: "CEO Metrics", path: "/dashboard/customerCare/CeoMetrics", pro: false },
      { id: "5.5", name: "Travel Vip Margin", path: "/dashboard/customerCare/TravelVipMargin", pro: false },
      { id: "5.6", name: "Partner PayOut", path: "/dashboard/customerCare/PartnerPayout", pro: false },
      { id: "5.6", name: "Partner PayOut Day", path: "/dashboard/customerCare/PartnerPayoutDay", pro: false, new: true },
      { id: "5.6", name: "Monthly Partner PayOut", path: "/dashboard/customerCare/MonthlyPartnerPayout", pro: false },
      { id: "5.7", name: "Cashgram PayOut", path: "/dashboard/customerCare/cashgramPayout", pro: false },
      { id: "5.8", name: " ER Report", path: "/dashboard/customerCare/ErReport", pro: false },
      {
        id: "5.9",
        name: "CloudWatch Errors",
        path: "/dashboard/customerCare/CloudwatchErrors",
        pro: false,
        new: true,
      },
    ],
  },

  {
  id: "6.0",
  icon: <TableIcon />, 
  name: "Cab Management",
  subItems: [
    {
      id: "6.1",
      name: "Cab Manage",
      path: "/dashboard/customerCare/CabManagement",
      pro: false,
    },
  ],
},
{
  id: "10.0",
  icon: <TableIcon />,
  name: "Mojo Audit",
  subItems: [
    {
      id: "10.1",
      name: "Mojo Audit",
      path: "/dashboard/customerCare/MojoAudit",
      pro: false,
    },
  ],
},
{
  id: "9.0",
  icon: <TableIcon />,
  name: "IBC Management",
  subItems: [
    {
      id: "9.1",
      name: "IBC Manage",
      path: "/dashboard/customerCare/IbcManagement",
      pro: false,
    },
  ],
},
{
  id: "11.0",
  icon: <TableIcon />,
  name: "Ops Partner Control",
  subItems: [
    {
      id: "11.1",
      name: "Partner Control Hub",
      path: "/dashboard/customerCare/OpsPartnerControl",
      pro: false,
      new: true,
    },
  ],
},
{
  id: "7.0",
  icon: <TableIcon />, 
  name: "Offers Management",
  subItems: [
    {
      id: "7.1",
      name: "Offer Manage",
      path: "/dashboard/customerCare/OfferManagement",
      pro: false,
    },
    {
      id: "7.2",
      name: "AIO Offer",
      path: "/dashboard/customerCare/AioOffer",
      pro: false,
    },
  ],
},
  {
    id: "8.0",
    icon: <TableIcon />,
    name: "Blue Chip Reports",
    subItems: [
      {
        id: "8.1",
        name: "Bluechip Report",
        path: "/dashboard/customerCare/BlueChipReport",
        pro: false,
      },
    ],
  },

];


const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();


  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {},
  );
  const { user_rights, login_username, login_partners } = useSelector(
    (state: RootState) => state.authStore,
  );
  const hideNpsPartnerDay = shouldHideNpsPartnerDay(login_username, login_partners);
  const cxView = isIndigoCxUser(login_username, user_rights);

  const withoutNpsPartnerDay = useCallback(
    (items: NavItem[]) => {
      if (!hideNpsPartnerDay) return items;
      return items.reduce<NavItem[]>((acc, item) => {
        if (!item.subItems) {
          acc.push(item);
          return acc;
        }
        const subItems = item.subItems.filter(
          (sub) => sub.path !== NPS_PARTNER_DAY_PATH,
        );
        if (subItems.length > 0) acc.push({ ...item, subItems });
        return acc;
      }, []);
    },
    [hideNpsPartnerDay],
  );

  const filterNavItems = useCallback((items: NavItem[]) => {
    if (cxView) {
      return items
        .filter((item) => item.id === "4.0")
        .map((item) => ({
          ...item,
          subItems: (item.subItems || []).filter((sub) => sub.id === "4.1"),
        }))
        .filter((item) => (item.subItems || []).length > 0);
    }
    if (!user_rights) return []; // Explicitly return empty if no rights
    const allowedIds = user_rights.split(',');

    if (allowedIds.includes("ALL")) {
      return withoutNpsPartnerDay(items);
    }

    const visible = items.reduce<NavItem[]>((acc, item) => {
      // Create a shallow copy to check subItems without mutating original
      if (item.subItems) {
        const visibleSubItems = item.subItems.filter(sub => sub.id && allowedIds.includes(sub.id));

        if (visibleSubItems.length > 0) {
          acc.push({ ...item, subItems: visibleSubItems });
        } else if (item.id && allowedIds.includes(item.id)) {
          // Parent explicitly allowed even if no children matches
          acc.push({ ...item, subItems: [] });
        }
      } else {
        if (item.id && allowedIds.includes(item.id)) {
          acc.push(item);
        }
      }
      return acc;
    }, []);

    return withoutNpsPartnerDay(visible);
  }, [user_rights, cxView, withoutNpsPartnerDay]);

  const filteredNavItems = useMemo(() => filterNavItems(navItems), [filterNavItems]);
  const filteredOthersItems = useMemo(() => filterNavItems(othersItems), [filterNavItems]);

  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? filteredNavItems : filteredOthersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, filteredNavItems, filteredOthersItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[270px]"
          : isHovered
            ? "w-[270px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <h2 className="font-bold">Analytics Panel</h2>
            </>
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(filteredNavItems, "main")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(filteredOthersItems, "others")}
            </div>
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;
