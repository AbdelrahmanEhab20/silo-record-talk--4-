import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { appClient } from "@/api/appClient";
import { ArrowLeft, Check, Sun, Moon, Smartphone, LogOut, Archive, ChevronDown, ChevronUp } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { siloConfirmDeleteAccount, siloConfirmLogout, siloError } from "@/lib/siloAlert";
import { createPageUrl } from "@/utils";
import UsageOverview from "@/components/UsageOverview";
import StorageUsagePanel from "@/components/storage/StorageUsagePanel";
import AIProviderSettings from "@/components/settings/AIProviderSettings";
import UserProfileCard from "@/components/settings/UserProfileCard";

const options = [
  { value: "system", label: "System", icon: Smartphone, desc: "Follows your device" },
  { value: "light", label: "Light", icon: Sun, desc: "Always light" },
  { value: "dark", label: "Dark", icon: Moon, desc: "Always dark" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { appearance, setAppearance } = useTheme();
  const { logout } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [appearanceCollapsed, setAppearanceCollapsed] = useState(true);
  const [storageCollapsed, setStorageCollapsed] = useState(true);

  const handleLogout = async () => {
    const confirmed = await siloConfirmLogout();
    if (!confirmed) return;
    try {
      await logout(true);
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await siloConfirmDeleteAccount();
    if (!confirmed) return;
    setDeletingAccount(true);
    try {
      const sessions = await appClient.entities.Session.list("-created_date", 200);
      await Promise.all(sessions.map((s) => appClient.entities.Session.delete(s.id)));
      await logout(true);
    } catch (e) {
      setDeletingAccount(false);
      await siloError("Delete failed", "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black transition-colors duration-300">
      <div className="max-w-lg mx-auto px-5 pt-2 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
           onClick={() => navigate(createPageUrl("Home"))}
           className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#A1A1A6] hover:text-gray-800 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] px-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 tracking-tight">
          Settings
        </h1>

        {/* User Profile Section */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider mb-3 px-1">
            Profile
          </p>
          <UserProfileCard />
        </section>

        {/* Usage (org-tracked minutes) */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider mb-3 px-1">
            Usage
          </p>
          <UsageOverview />
        </section>

        {/* Storage Section */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider mb-3 px-1">
            Storage
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
            {/* Collapsed banner — always visible */}
            <button
              onClick={() => setStorageCollapsed(c => !c)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-purple-400" />
                <span className="text-[15px] font-medium text-gray-900 dark:text-white">Storage Usage</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={e => { e.stopPropagation(); navigate('/ArchivedSessions'); }}
                  className="text-xs text-purple-500 font-medium"
                >
                  View Archive
                </button>
                {storageCollapsed
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronUp className="w-4 h-4 text-gray-400" />
                }
              </div>
            </button>
            {/* Expanded detail */}
            {!storageCollapsed && (
              <div className="border-t border-gray-100 dark:border-[#3A3A3C]">
                <StorageUsagePanel />
              </div>
            )}
          </div>
        </section>

        {/* AI & Speech Section */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider mb-3 px-1">
            AI & Speech-to-Text Settings
          </p>
          <AIProviderSettings />
        </section>

        {/* Appearance Section */}
         <section className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider mb-3 px-1">
            Appearance
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setAppearanceCollapsed(c => !c)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors"
            >
              <div className="text-left">
                <p className="text-[15px] font-medium text-gray-900 dark:text-white">Appearance</p>
                <p className="text-xs text-gray-400 dark:text-[#A1A1A6] mt-0.5">
                  {options.find(o => o.value === appearance)?.label || "System"}
                </p>
              </div>
              {appearanceCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
            </button>
            {!appearanceCollapsed && (
              <div className="divide-y divide-gray-100 dark:divide-[#3A3A3C] border-t border-gray-100 dark:border-[#3A3A3C]">
                {options.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setAppearance(value)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors min-h-[44px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-[#A1A1A6]" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-medium text-gray-900 dark:text-white">{label}</p>
                        <p className="text-xs text-gray-400 dark:text-[#A1A1A6]">{desc}</p>
                      </div>
                    </div>
                    {appearance === value && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* App Info */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider mb-3 px-1">
            About
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-[15px] text-gray-900 dark:text-white">Version</span>
              <span className="text-sm text-gray-400 dark:text-[#A1A1A6]">0.2</span>
            </div>
            <div className="border-t border-gray-100 dark:border-[#3A3A3C] flex items-center justify-between px-5 py-4">
              <span className="text-[15px] text-gray-900 dark:text-white">App</span>
              <span className="text-sm text-gray-400 dark:text-[#A1A1A6]">Silo AI Notes</span>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section className="mb-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-[#A1A1A6] uppercase tracking-wider mb-3 px-1">
            Account
          </p>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors min-h-[44px] min-w-[44px] border-b border-gray-100 dark:border-[#3A3A3C]"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[15px] font-medium">Log Out</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors min-h-[44px] min-w-[44px] disabled:opacity-50"
            >
              <span className="text-[15px] font-medium">
                {deletingAccount ? "Deleting..." : "Delete Account"}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}