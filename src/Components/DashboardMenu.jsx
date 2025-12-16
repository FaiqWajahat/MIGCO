"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Package,
  Settings,
  BadgeCheck,
  Warehouse,
  ShieldCheck,
  Wallet,
  ChevronRight
} from "lucide-react";

import { useLanguage } from "@/stores/language";

// --- Configuration ---
const mainMenu = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/Dashboard",
  },
  {
    title: "Projects",
    icon: Warehouse,
    children: [
      { title: "All Projects", href: "/Dashboard/Projects" },
      { title: "Add Project", href: "/Dashboard/Projects/Add" },
     
    ]
  },
  {
    title: "Employees",
    icon: Users,
    children: [
      { title: "All Employees", href: "/Dashboard/Employees" },
      { title: "Add Employee", href: "/Dashboard/Employees/Add" },
      { title: "Expenses / Claims", href: "/Dashboard/Employees/Expense" },
     
    ],
  },
  {
    title: "Company Assets",
    icon: Package,
    children: [
      { title: "All Assets", href: "/Dashboard/Company-Assets" },
      { title: "Add Asset", href: "/Dashboard/Company-Assets/Add" },
      
    ],
  },
  {
    title: "Attendance",
    icon: ClipboardCheck,
    children: [
      { title: "Mark Attendance", href: "/Dashboard/Attendance/Mark" },
      { title: "History", href: "/Dashboard/Attendance" },
    ],
  },
  {
    title: "Salary",
    icon: Wallet,
    href: "/Dashboard/Salary",
  },
];

const accountMenu = [
  {
    title: "Settings",
    icon: Settings,
    children: [
      { title: "Theme Color", href: "/Dashboard/Setting/Theme" },
      { title: "Font Style", href: "/Dashboard/Setting/Fonts" },
    ],
  },
  
  {
    title: "System Users",
    icon: ShieldCheck,
    href: "/Dashboard/Users",
  },
  { 
    title: "My Profile", 
    icon: BadgeCheck, 
    href: "/Dashboard/Profile" 
  },
  
];

// --- Components ---
const SidebarItem = ({ item, pathname }) => {
  const { t } = useLanguage();
  const isActive = item.href === pathname;

  const hasActiveChild = item.children?.some(
    (child) => child.href === pathname
  );

  const Icon = item.icon;

  // Dropdown item
  if (item.children) {
    return (
      <li>
        <details className="group" open={hasActiveChild}>
          <summary
            className={`flex items-center justify-between px-4 py-1.5 rounded-md cursor-pointer transition-all duration-300 select-none
            ${hasActiveChild
              ? "text-[var(--primary-color)] font-semibold bg-base-200"
              : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm">{t[item.title]}</span>
            </div>

            <ChevronRight
              className={`w-4 h-4 transition-transform duration-300 group-open:rotate-90
                ${hasActiveChild ? "text-[var(--primary-color)]" : "text-base-content/40"}`}
            />
          </summary>

          <ul className="mt-2 ml-4 border-l-2 border-base-200 pl-2 space-y-1">
            {item.children.map((child, index) => {
              const isChildActive = pathname === child.href;

              return (
                <li key={index}>
                  <Link
                    href={child.href}
                    className={`block px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 
                      ${isChildActive
                        ? "bg-[var(--primary-color)] text-white shadow-[var(--primary-color)]/20"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                      }`}
                  >
                    {t[child.title]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      </li>
    );
  }

  // Single link
  return (
    <li>
      <Link
        href={item.href || "#"}
        className={`flex items-center gap-3 px-4 py-1.5 rounded-md transition-all duration-200 select-none font-medium 
          ${isActive
            ? "bg-[var(--primary-color)] text-white shadow-[var(--primary-color)]/20"
            : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
          }`}
      >
        <Icon className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-sm">{t[item.title]}</span>
      </Link>
    </li>
  );
};

const DashboardMenu = () => {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="w-full h-full flex flex-col justify-between px-2 bg-base-100">
      
      <div className="space-y-6">
        <div>
          <p className="px-4 mb-3 text-[11px] font-bold text-base-content/40 uppercase tracking-widest">
            {t["Main Menu"] || "Main Menu"}
          </p>

          <ul className="space-y-1">
            {mainMenu.map((item, index) => (
              <SidebarItem key={index} item={item} pathname={pathname} />
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="px-4 mb-3 mt-6 text-[11px] font-bold text-base-content/40 uppercase tracking-widest">
          {t["System"] || "System"}
        </p>

        <ul className="space-y-1">
          {accountMenu.map((item, index) => (
            <SidebarItem key={index} item={item} pathname={pathname} />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardMenu;
