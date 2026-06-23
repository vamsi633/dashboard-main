"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { signOut, useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/graphs", label: "Graphs" },
  { href: "/sensors", label: "Sensors" },
  { href: "/settings", label: "Settings" },
  { href: "/announcements", label: "Announcements" },
];

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      )
        setIsDropdownOpen(false);
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      )
        setIsMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userImage =
    session?.user?.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userName
    )}&background=2A3D4A&color=FFFFFF&size=96`;

  const [timeStr, setTimeStr] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      setTimeStr(`${days[now.getDay()]} · ${h12}:${m} ${ampm}`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 z-50 w-full"
      style={{
        height: 72,
        background: "#2A3D4A",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="px-4 sm:px-6 lg:px-10 xl:px-12 mx-auto max-w-[1500px] h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.1)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2C7 7 5 11 5 15a7 7 0 0 0 14 0c0-4-2-8-7-13z" />
              <path d="M12 6v16" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <div
              className="text-[17px] font-medium tracking-tight"
              style={{ fontFamily: "'Fraunces', serif", color: "#FFFFFF" }}
            >
              EPIC IoT
            </div>
            <div
              className="text-[10px] uppercase tracking-[0.08em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Field Station Network
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all"
                style={{
                  color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                  background: isActive
                    ? "rgba(255,255,255,0.12)"
                    : "transparent",
                }}
              >
                {link.label}
                {isActive && (
                  <span
                    className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] rounded-full"
                    style={{ background: "#FDFBF5" }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <span
            className="hidden lg:block text-[13px]"
            style={{
              fontFamily: "'Fraunces', serif",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {timeStr}
          </span>
          <button
            className="relative focus:outline-none group"
            aria-label="Notifications"
          >
            <BellIcon
              className="h-6 w-6 transition-colors"
              style={{ color: "rgba(255,255,255,0.7)" }}
            />
            <span
              className="absolute -top-1.5 -right-1.5 text-[10px] font-bold rounded-full min-w-[18px] flex items-center justify-center px-1"
              style={{ background: "#B5452D", color: "#FFFFFF" }}
            >
              3
            </span>
          </button>
          <div className="relative" ref={dropdownRef}>
            <button onClick={toggleDropdown} className="focus:outline-none">
              {status === "loading" ? (
                <div
                  className="w-9 h-9 rounded-full animate-pulse"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                />
              ) : (
                <Image
                  src={userImage}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="rounded-full transition-all hover:scale-105"
                  style={{ border: "2px solid rgba(255,255,255,0.25)" }}
                />
              )}
            </button>
            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-xl overflow-hidden z-50"
                style={{
                  background: "#FDFBF5",
                  border: "1px solid #E5DBC6",
                  boxShadow: "0 12px 32px -8px rgba(30,46,62,0.2)",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid #E5DBC6" }}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={userImage}
                      alt=""
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: "#FFFFFF" }}
                      >
                        {userName}
                      </div>
                      <div
                        className="text-[11px] truncate"
                        style={{ color: "#88968C" }}
                      >
                        {userEmail}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[#F3EDE1]"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <UserCircleIcon className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[#F3EDE1]"
                    style={{ color: "rgba(255,255,255,0.7)" }}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </Link>
                </div>
                <div
                  className="px-3 py-2"
                  style={{ borderTop: "1px solid #E5DBC6" }}
                >
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: "/auth/signin" });
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
                    style={{ background: "#B5452D", color: "#FFFFFF" }}
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            className="md:hidden focus:outline-none"
            onClick={toggleMobileMenu}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" style={{ color: "#FFFFFF" }} />
            ) : (
              <Bars3Icon className="h-6 w-6" style={{ color: "#FFFFFF" }} />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="absolute top-[72px] left-0 w-full md:hidden z-40"
          style={{
            background: "#FDFBF5",
            borderBottom: "1px solid #E5DBC6",
            boxShadow: "0 12px 24px -8px rgba(30,46,62,0.15)",
          }}
        >
          <div className="px-5 py-4 space-y-1">
            {session && (
              <div
                className="flex items-center gap-3 pb-3 mb-2"
                style={{ borderBottom: "1px solid #E5DBC6" }}
              >
                <Image
                  src={userImage}
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                <div className="min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "#FFFFFF" }}
                  >
                    {userName}
                  </div>
                  <div
                    className="text-[11px] truncate"
                    style={{ color: "#88968C" }}
                  >
                    {userEmail}
                  </div>
                </div>
              </div>
            )}
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    color: isActive ? "#25421F" : "#88968C",
                    background: isActive
                      ? "rgba(50,74,95,0.08)"
                      : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            <div
              className="pt-3 mt-2"
              style={{ borderTop: "1px solid #E5DBC6" }}
            >
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                <UserCircleIcon className="h-4 w-4" />
                Profile
              </Link>
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/auth/signin" });
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium mt-1 transition-all"
                style={{ background: "#B5452D", color: "#FFFFFF" }}
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
