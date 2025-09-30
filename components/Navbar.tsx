"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BellIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { signOut, useSession } from "next-auth/react";

const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Toggle dropdown on profile click
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Get user name and profile image from session
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userImage =
    session?.user?.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userName
    )}&background=5b21b6&color=fff&size=96`;

  return (
    <nav className="fixed top-0 left-0 z-50 w-full h-[90px] bg-[#0F111A] text-[#D9DFF2] flex justify-between items-center shadow-lg px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-48">
      {/* Logo on the left */}
      <div className="flex items-center">
        <Image
          src="/logo.png"
          alt="Logo"
          width={200}
          height={60}
          className="object-contain"
        />
      </div>

      {/* Middle: Navigation Links (Desktop) */}
      <div className="hidden md:flex flex-1 justify-center space-x-8">
        <Link
          href="/"
          className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
        >
          Home
        </Link>
       <Link
          href="/graphs"
          className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
        > 
          Graphs
        </Link>
        <Link
          href="/sensors"
          className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
        >
          Sensors
        </Link>
        <Link
          href="/settings"
          className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
        >
          Settings
        </Link>
        <Link
          href="/announcements"
          className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
        >
          Announcements
        </Link>
      </div>

      {/* Right side: Notification, Profile, and Mobile Menu Toggle */}
      <div className="flex items-center space-x-4">
        <button className="relative focus:outline-none">
          <BellIcon className="h-8 w-8 text-[#D9DFF2] hover:text-gray-300 transition-colors stroke-2 fill-current" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            3
          </span>
        </button>
        <div className="relative" ref={dropdownRef}>
          <button onClick={toggleDropdown} className="focus:outline-none">
            {status === "loading" ? (
              <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse" />
            ) : (
              <Image
                src={userImage}
                alt="Profile"
                width={48}
                height={48}
                className="rounded-full border-2 border-[#D9DFF2] hover:border-gray-300 transition-all"
              />
            )}
          </button>
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#0F111A] rounded-lg shadow-lg py-2 px-2 z-50 border border-[#9CA3AF]">
              <div className="px-3 py-3 border-b border-gray-700">
                <div className="text-white font-medium truncate">
                  {userName}
                </div>
                <div className="text-gray-400 text-sm truncate">
                  {userEmail}
                </div>
              </div>
              <div className="py-1">
                <Link
                  href="/profile"
                  className="block px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="flex items-center">
                    <UserCircleIcon className="h-5 w-5 mr-2" />
                    Profile
                  </div>
                </Link>
              </div>
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/auth/signin" });
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center justify-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white transition-colors rounded-md mt-1"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden focus:outline-none"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-8 w-8 text-[#D9DFF2] hover:text-gray-300 transition-colors" />
          ) : (
            <Bars3Icon className="h-8 w-8 text-[#D9DFF2] hover:text-gray-300 transition-colors" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="absolute top-[90px] left-0 w-full bg-[#0F111A] shadow-lg flex flex-col items-center space-y-4 py-4 md:hidden z-40"
        >
          {/* User info in mobile menu */}
          {session && (
            <div className="w-full px-6 pb-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <Image
                  src={userImage}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <div className="text-white font-medium text-sm">
                    {userName}
                  </div>
                  <div className="text-gray-400 text-xs">{userEmail}</div>
                </div>
              </div>
            </div>
          )}

          <Link
            href="/"
            className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/graphs"
            className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Graphs
          </Link>
          <Link
            href="/sensors"
            className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Sensors
          </Link>
          <Link
            href="/settings"
            className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Settings
          </Link>
          <Link
            href="/announcements"
            className="text-[#787d8f] hover:text-[#D9DFF2] transition-colors font-medium text-lg"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Announcements
          </Link>

          {/* Logout button in mobile menu */}
          <button
            onClick={() => {
              signOut({ callbackUrl: "/auth/signin" });
              setIsMobileMenuOpen(false);
            }}
            className="text-red-500 hover:text-red-400 transition-colors font-medium text-lg mt-4 pt-4 border-t border-gray-700 w-full"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
