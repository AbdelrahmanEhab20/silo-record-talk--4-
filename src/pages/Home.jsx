import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { appClient } from "@/api/appClient";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SESSIONS_QUERY_KEY } from "@/lib/query-client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Mic, Loader2, Trash2, CheckSquare, Search, FolderOpen, ChevronDown, Check, Folder, FolderInput, FileText, BookOpen, Archive, Flag } from "lucide-react";
import FolderReportModal from "@/components/session/FolderReportModal";
import SavedReportsModal from "@/components/session/SavedReportsModal";
import { colorForFolder } from "@/components/FolderBadge";
import GlobalSearch from "@/components/GlobalSearch";
import FolderSidebar from "@/components/FolderSidebar";

import SessionCard from "@/components/session/SessionCard";
import PullToRefresh from "@/components/PullToRefresh";
import GoogleAd from "@/components/ads/GoogleAd";

const TABS = ["All", "Meetings", "Ideas", "Saved"];

export default function Home() {
  const scrollRef = useRef(null);
  const [activeTab, setActiveTab] = useState("All");
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [folderSidebarOpen, setFolderSidebarOpen] = useState(false);
  const [folderReportOpen, setFolderReportOpen] = useState(false);
  const [savedReportsOpen, setSavedReportsOpen] = useState(false);
  const [openReportData, setOpenReportData] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [moveToFolderOpen, setMoveToFolderOpen] = useState(false);
  const [movingToFolder, setMovingToFolder] = useState(false);
  const [newFolderDraft, setNewFolderDraft] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [tagFilters, setTagFilters] = useState(new Set());
  const [speakerFilter, setSpeakerFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allFolders, setAllFolders] = useState([]);
  const [totalSessions, setTotalSessions] = useState([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const initUser = async () => {
      try {
        const userData = await appClient.auth.me();
        setUser(userData);
        if (userData?.email) {
          await appClient.functions
            .invoke('initializeUserSubscription', { user_email: userData.email })
            .catch(() => null);
          const subs = await appClient.entities.PlanSubscription.filter({ user_email: userData.email });
          if (subs.length > 0) setSubscription(subs[0]);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      } finally {
        setSessionsLoaded(true);
      }
    };
    initUser();
  }, []);

  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      last_week: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      last_month: new Date(now.getFullYear(), now.getMonth() - 1, 1)
    };
    return ranges[dateFilter] || null;
  };

  // Filter all sessions first
  const recentlyArchivedCount = useMemo(() => {
    return (totalSessions || []).filter(s => s.storage_tier === 'archived').length;
  }, [totalSessions]);

  const completeFilteredSessions = useMemo(() => {
    return (totalSessions || []).filter(s => {
      if (s.is_subsession) return false;
      if (s.storage_tier === 'archived') return false; // exclude archived from home
      // Filter out empty placeholder sessions (main session created by Stop & New before finalization)
      if (!s.audio_file_url && !s.transcript_text && s.duration === 0 && s.processing_status === 'processing') return false;
      const passFolder = !activeFolder || (activeFolder === "__flagged__" ? s.is_flagged : s.folder === activeFolder);
      const passDate = dateFilter === "all" || new Date(s.created_date) >= getDateRange();
      const passTags = tagFilters.size === 0 || [...tagFilters].every(t => (s.tags || []).includes(t));
      const passSpeaker = !speakerFilter || (s.transcript_text || "").includes(speakerFilter + ":");
      return passFolder && passDate && passTags && passSpeaker;
    });
  }, [totalSessions, activeFolder, dateFilter, tagFilters, speakerFilter]);

  // Then paginate the filtered results
  const allSessions = useMemo(() => {
    return completeFilteredSessions.slice(0, page * ITEMS_PER_PAGE);
  }, [completeFilteredSessions, page]);

  const hasMore = completeFilteredSessions.length > allSessions.length;

  const loadMoreSessions = async () => {
    if (!user || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setPage(prev => prev + 1);
    setLoadingMore(false);
  };

  const mergeSessionUpdate = (updated) => {
    if (!updated?.id) return;
    setTotalSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  };

  const mergeSessionsUpdates = (updates) => {
    if (!updates?.length) return;
    const byId = new Map(updates.map((u) => [u.id, u]));
    setTotalSessions((prev) => prev.map((s) => (byId.has(s.id) ? { ...s, ...byId.get(s.id) } : s)));
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  };

  const removeSessionsFromList = (ids) => {
    const idSet = new Set(ids);
    setTotalSessions((prev) => prev.filter((s) => !idSet.has(s.id)));
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  };

  const applyFolderRename = (oldName, newName) => {
    setTotalSessions((prev) => prev.map((s) => (s.folder === oldName ? { ...s, folder: newName } : s)));
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  };

  const applyFolderDelete = (folderName) => {
    setTotalSessions((prev) => prev.map((s) => (s.folder === folderName ? { ...s, folder: null } : s)));
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  };

  const { isLoading } = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      if (!user) return [];
      const allUserSessions = await appClient.entities.Session.filter({ user_email: user.email }, "-created_date");
      setTotalSessions(allUserSessions);
      return allUserSessions;
    },
    enabled: !!user,
    refetchInterval: (query) => {
      const hasPending = Array.isArray(totalSessions) && totalSessions.some(s => s.processing_status === 'pending' || s.processing_status === 'processing');
      return hasPending ? 5000 : false;
    },
  });

  // Update allFolders whenever totalSessions changes
  useEffect(() => {
    const folders = [...new Set(totalSessions.filter(s => s.folder).map(s => s.folder))].sort();
    setAllFolders(folders);
  }, [totalSessions]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.full_name?.split(" ")[0] || "";

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cancelSelect = () => {
    setSelecting(false);
    setSelected(new Set());
    setMoveToFolderOpen(false);
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = [...selected];
    await Promise.all(ids.map((id) => appClient.entities.Session.delete(id)));
    removeSessionsFromList(ids);
    cancelSelect();
    setDeleting(false);
  };

  const moveSelectedToFolder = async (folderName) => {
    if (selected.size === 0) return;
    setMovingToFolder(true);
    const ids = [...selected];
    const updated = await Promise.all(
      ids.map((id) => appClient.entities.Session.update(id, { folder: folderName || null }))
    );
    mergeSessionsUpdates(updated);
    setMovingToFolder(false);
    setMoveToFolderOpen(false);
    cancelSelect();
  };

  const archiveSelected = async () => {
    if (selected.size === 0) return;
    const now = new Date().toISOString();
    const deletionAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await Promise.all([...selected].map((id) => appClient.entities.Session.update(id, {
      storage_tier: 'archived',
      archived_at: now,
      scheduled_deletion_at: deletionAt,
    })));
    mergeSessionsUpdates(updated);
    cancelSelect();
  };

  const flagSelected = async () => {
    if (selected.size === 0) return;
    const selectedSessions = totalSessions.filter(s => selected.has(s.id));
    const allFlagged = selectedSessions.every(s => s.is_flagged);
    const updated = await Promise.all([...selected].map((id) => appClient.entities.Session.update(id, { is_flagged: !allFlagged })));
    mergeSessionsUpdates(updated);
    cancelSelect();
  };

  const selectAll = () => {
    if (selected.size === allSessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allSessions.map((s) => s.id)));
    }
  };

  const allTags = [...new Set((totalSessions || []).flatMap(s => s.tags || []))].sort();

  const allSpeakers = [...new Set((totalSessions || []).flatMap(s => {
    if (!s.transcript_text) return [];
    return [...s.transcript_text.matchAll(/\]\s*([^:]+):/g)].map(m => m[1].trim()).filter(Boolean);
  }))].sort();

  const toggleTag = (tag) => {
    setTagFilters(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const showSessions = allSessions.length > 0;

  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-[#F5F5F7]';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subText = isDark ? 'text-[#A1A1A6]' : 'text-gray-500';
  const cardBg = isDark ? 'bg-white/5 border-white/8 hover:bg-white/8' : 'bg-white border-gray-200 hover:bg-gray-50';
  const btnBg = isDark ? 'bg-white/8 border-white/8' : 'bg-white border-gray-200';
  const btnText = isDark ? 'text-white/50' : 'text-gray-500';

  const handleRefresh = async () => {
    setPage(1);
    const allUserSessions = await appClient.entities.Session.filter({ user_email: user.email }, "-created_date");
    setTotalSessions(allUserSessions);
    queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className={`min-h-screen ${bg} ${text} overflow-x-hidden`}>
        <div className="w-full px-5 pt-6 pb-32">
          {/* Greeting */}
          {user && (
            <div className="mb-6 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden">
                {user.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {user.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Welcome back</p>
                <h1 className="text-lg font-bold tracking-tight leading-tight">{firstName}</h1>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSearchOpen(true)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/8 text-white/50 hover:bg-white/14 hover:text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'}`}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFolderSidebarOpen(true)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${activeFolder ? 'bg-purple-500/15 text-purple-400' : isDark ? 'bg-white/8 text-white/50 hover:bg-white/14 hover:text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'}`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {activeFolder && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-500" />}
                </button>
                <button
                  onClick={() => selecting ? cancelSelect() : setSelecting(true)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selecting ? 'bg-purple-500/15 text-purple-400' : isDark ? 'bg-white/8 text-white/50 hover:bg-white/14 hover:text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900'}`}
                  title="Multi-select sessions"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Select mode bar */}
          {selecting ? (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between px-1 min-h-[44px]">
                <button onClick={selectAll} className="min-h-[44px] px-3 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    {selected.size === (allSessions || []).length ? "Deselect All" : "Select All"}
                  </button>
                <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {selected.size} selected
                </span>
                <button onClick={cancelSelect} className={`min-h-[44px] px-3 text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                  Cancel
                </button>
              </div>

            </div>
          ) : (
            /* Filters */
            <div className="mb-4 space-y-3">
              {/* Date Filter */}
              <div className="relative">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${isDark ? 'bg-white/8 border border-white/8 text-white/70 hover:bg-white/12' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <span>Filters</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {filterOpen && (
                  <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border ${isDark ? 'bg-[#1C1C1E] border-white/8' : 'bg-white border-gray-200'} shadow-lg z-20 overflow-hidden`}>
                    <div className="p-3 space-y-3">
                      {/* Date */}
                      <div>
                        <p className={`text-xs font-semibold uppercase ${isDark ? 'text-white/40' : 'text-gray-500'} mb-2`}>Date</p>
                        <div className="space-y-1">
                          {[{id: 'all', label: 'All time'}, {id: 'today', label: 'Today'}, {id: 'week', label: 'This week'}, {id: 'last_week', label: 'Last week'}, {id: 'month', label: 'This month'}, {id: 'last_month', label: 'Last month'}].map(d => (
                            <button key={d.id} onClick={() => setDateFilter(d.id)} className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between ${dateFilter === d.id ? 'bg-purple-500/20 text-purple-400 font-medium' : isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-600 hover:text-gray-900'}`}>
                              {d.label}
                              {dateFilter === d.id && <Check className="w-3 h-3" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tags */}
                      {allTags.length > 0 && (
                        <div>
                          <p className={`text-xs font-semibold uppercase ${isDark ? 'text-white/40' : 'text-gray-500'} mb-2`}>Tags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allTags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  tagFilters.has(tag)
                                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                                    : isDark ? 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80' : 'border-gray-200 text-gray-500 hover:border-gray-400'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}



                      {/* Clear all */}
                      {(dateFilter !== 'all' || tagFilters.size > 0 || speakerFilter) && (
                        <button
                          onClick={() => { setDateFilter('all'); setTagFilters(new Set()); setSpeakerFilter(''); setFilterOpen(false); }}
                          className="w-full text-xs text-red-400 hover:text-red-300 py-1.5 border-t border-white/5 pt-3 text-center"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Active filters display */}
              {(activeFolder || dateFilter !== 'all' || tagFilters.size > 0 || speakerFilter) && (
                <div className="flex flex-wrap gap-2">
                  {activeFolder && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1 ${activeFolder === "__flagged__" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-purple-500/15 text-purple-400 border-purple-500/20"}`}>
                      {activeFolder === "__flagged__" ? "🚩 Flagged" : `📁 ${activeFolder}`}
                      <button onClick={() => setActiveFolder(null)} className={`${activeFolder === "__flagged__" ? "text-amber-400/60 hover:text-amber-400" : "text-purple-400/60 hover:text-purple-400"}`}>×</button>
                    </span>
                  )}
                  {dateFilter !== 'all' && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-500/15 text-green-400 border border-green-500/20 flex items-center gap-1">
                      {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This week' : dateFilter === 'last_week' ? 'Last week' : dateFilter === 'month' ? 'This month' : 'Last month'}
                      <button onClick={() => setDateFilter('all')} className="text-green-400/60 hover:text-green-400">×</button>
                    </span>
                  )}
                  {[...tagFilters].map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                      🏷 {tag}
                      <button onClick={() => toggleTag(tag)} className="text-cyan-400/60 hover:text-cyan-400">×</button>
                    </span>
                  ))}
                  {speakerFilter && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      🎙 {speakerFilter}
                      <button onClick={() => setSpeakerFilter('')} className="text-amber-400/60 hover:text-amber-400">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder strip */}
           {!selecting && allFolders.length > 0 && (
             <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4 -mx-1 px-1">
               <button
                 onClick={() => setActiveFolder(null)}
                 className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                   activeFolder === null
                     ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                     : isDark ? 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20' : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300'
                 }`}
               >
                 All
               </button>
               {allFolders.map(name => {
                 const color = colorForFolder(name);
                 const isActive = activeFolder === name;
                 return (
                   <button
                     key={name}
                     onClick={() => setActiveFolder(isActive ? null : name)}
                     className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all`}
                     style={isActive
                       ? { background: `${color}25`, color, borderColor: `${color}50` }
                       : { background: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb", color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }
                     }
                   >
                     <Folder className="w-3 h-3" />
                     {name}
                   </button>
                 );
               })}
             </div>
           )}

          {/* Folder report button — only when a named folder is active */}
          {activeFolder && activeFolder !== "__flagged__" && !selecting && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setOpenReportData(null); setFolderReportOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.15),rgba(99,102,241,0.15))", border: "1px solid rgba(168,85,247,0.25)", color: "#A855F7" }}
              >
                <FileText className="w-4 h-4" />
                Folder Report
              </button>
              <button
                onClick={() => setSavedReportsOpen(true)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? "bg-white/6 border border-white/10 text-white/50 hover:bg-white/10" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Saved reports + archived banner row */}
          {!activeFolder && !selecting && allSessions && allSessions.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button
                onClick={() => setSavedReportsOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? "bg-white/5 border border-white/8 text-white/40 hover:bg-white/8 hover:text-white/60" : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50"}`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Saved Reports
              </button>
              {recentlyArchivedCount > 0 && (
                <Link
                  to="/ArchivedSessions"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archived recently
                  <span className="w-4.5 h-4.5 min-w-[18px] rounded-full bg-amber-400 text-[10px] font-bold text-black flex items-center justify-center">{recentlyArchivedCount}</span>
                </Link>
              )}
              <button
                onClick={() => setActiveFolder(activeFolder === "__flagged__" ? null : "__flagged__")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeFolder === "__flagged__" ? "bg-amber-500/20 border border-amber-500/30 text-amber-400" : isDark ? "bg-white/5 border border-white/8 text-white/40 hover:bg-white/8 hover:text-white/60" : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50"}`}
              >
                <Flag className="w-3.5 h-3.5" />
                Flagged
              </button>
            </div>
          )}

          {/* Processing banner — hidden */}
          {/* <ProcessingBanner /> */}

          {/* Sessions list or empty state */}
          {(!user || !sessionsLoaded) ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
          ) : showSessions ? (
            <>
               <div className="space-y-2">
                 {allSessions.map((session, idx) => (
                  <React.Fragment key={session.id}>
                  <div className="flex items-center gap-3">
                    {(selecting || selected.size > 0) && (
                      <button
                        onClick={() => toggleSelect(session.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selected.has(session.id)
                            ? 'bg-purple-500 border-purple-500'
                            : isDark ? 'border-white/20 hover:border-white/40' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {selected.has(session.id) && <Check className="w-4 h-4 text-white" />}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <SessionCard
                        session={session}
                        selecting={selecting}
                        selected={selected.has(session.id)}
                        onToggleSelect={toggleSelect}
                        allFolders={allFolders}
                        onSessionUpdated={mergeSessionUpdate}
                        onSessionRemoved={(id) => removeSessionsFromList([id])}
                      />
                    </div>
                  </div>
                  {/* Show ad after every 5th session */}
                  {(idx + 1) % 5 === 0 && (
                    <div className="py-1">
                      <GoogleAd adFormat="auto" subscription={subscription} />
                    </div>
                  )}
                  </React.Fragment>
                ))}
              </div>
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={loadMoreSessions}
                    disabled={loadingMore}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      loadingMore
                        ? 'opacity-60 cursor-not-allowed'
                        : isDark ? 'bg-white/8 border-white/10 text-white/70 hover:bg-white/12 hover:text-white' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)" }}
              >
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No sessions found</h2>
              <p className="text-sm text-[#A1A1A6]">Try adjusting your filters or tap + New Session to start recording</p>
            </div>
          )}
        </div>

        {/* Multi-select action bar */}
        {selecting && selected.size > 0 && (
          <div className="fixed bottom-20 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
            <div className="pointer-events-auto relative flex items-center gap-1 rounded-2xl px-2 py-2 shadow-2xl"
              style={{ background: isDark ? "rgba(28,28,30,0.97)" : "rgba(255,255,255,0.97)", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb" }}>
              {/* Flag */}
              <button
                onClick={flagSelected}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors hover:bg-amber-500/10"
              >
                <Flag className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-medium">Flag</span>
              </button>
              {/* Archive */}
              <button
                onClick={archiveSelected}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors hover:bg-purple-500/10"
              >
                <Archive className="w-5 h-5 text-purple-400" />
                <span className="text-[10px] text-purple-400 font-medium">Archive</span>
              </button>
              {/* Add to Folder */}
              <button
                onClick={() => { setNewFolderDraft(""); setMoveToFolderOpen(true); }}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors hover:bg-blue-500/10"
              >
                <FolderInput className="w-5 h-5 text-blue-400" />
                <span className="text-[10px] text-blue-400 font-medium">Folder</span>
              </button>
              {/* Divider */}
              <div className={`w-px h-8 mx-1 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />
              {/* Delete */}
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-5 h-5 text-red-400 animate-spin" /> : <Trash2 className="w-5 h-5 text-red-400" />}
                <span className="text-[10px] text-red-400 font-medium">Delete {selected.size}</span>
              </button>
            </div>
          </div>
        )}

        {/* FAB — hide when selecting, positioned above bottom tab bar */}
         {!selecting && (
           <div className="fixed left-0 right-0 flex justify-center z-40 pointer-events-none" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 12px)' }}>
             <Link to={createPageUrl("Recording")} className="pointer-events-auto">
               <button
                 className="flex items-center gap-2.5 px-6 h-14 rounded-full text-[15px] font-semibold text-white shadow-2xl transition-all active:scale-95 min-h-[56px] min-w-[56px]"
                 style={{
                   background: "linear-gradient(135deg, #A855F7, #6366F1, #22D3EE)",
                   boxShadow: "0 8px 32px rgba(139, 92, 246, 0.4)",
                 }}
               >
                 <Plus className="w-5 h-5" />
                 New Session
               </button>
             </Link>
           </div>
         )}
      </div>
      {searchOpen && <GlobalSearch sessions={allSessions || []} onClose={() => setSearchOpen(false)} />}
      {folderSidebarOpen && (
        <FolderSidebar
          sessions={(totalSessions || []).filter(s => !s.is_subsession)}
          activeFolder={activeFolder}
          onSelect={setActiveFolder}
          onClose={() => setFolderSidebarOpen(false)}
          onFolderRenamed={applyFolderRename}
          onFolderDeleted={applyFolderDelete}
        />
      )}
      {folderReportOpen && (openReportData?.folder_name || (activeFolder && activeFolder !== "__flagged__")) && (
        <FolderReportModal
          folderName={openReportData?.folder_name || activeFolder}
          sessions={allSessions || []}
          user={user}
          initialReport={openReportData}
          onClose={() => { setFolderReportOpen(false); setOpenReportData(null); }}
        />
      )}
      {savedReportsOpen && (
        <SavedReportsModal
          user={user}
          sessions={allSessions || []}
          onOpenReport={(report) => {
            setOpenReportData(report);
            setFolderReportOpen(true);
          }}
          onClose={() => setSavedReportsOpen(false)}
        />
      )}
      {/* Folder picker modal — same style as FolderBadge */}
      {moveToFolderOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setMoveToFolderOpen(false)}
        >
          <div
            className={`w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden ${isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white border border-gray-200"}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-white/8" : "border-gray-100"}`}>
              <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Add to Folder</span>
              <button
                onClick={() => setMoveToFolderOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-lg leading-none ${isDark ? "bg-white/8 text-white/50 hover:text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}
              >
                ×
              </button>
            </div>
            {/* New folder input */}
            <div className="px-4 py-3">
              <p className={`text-xs mb-2 ${isDark ? "text-white/40" : "text-gray-400"}`}>Create new folder</p>
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
                <input
                  autoFocus
                  value={newFolderDraft}
                  onChange={e => setNewFolderDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newFolderDraft.trim()) { moveSelectedToFolder(newFolderDraft.trim()); setNewFolderDraft(""); } }}
                  placeholder="Folder name…"
                  className={`flex-1 text-sm bg-transparent outline-none ${isDark ? "text-white placeholder-white/30" : "text-gray-900 placeholder-gray-400"}`}
                />
              </div>
              <button
                onClick={() => { if (newFolderDraft.trim()) { moveSelectedToFolder(newFolderDraft.trim()); setNewFolderDraft(""); } }}
                disabled={!newFolderDraft.trim() || movingToFolder}
                className="w-full mt-2 h-10 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}
              >
                {movingToFolder ? "Moving…" : "Create"}
              </button>
            </div>
            {/* Existing folders */}
            {allFolders.length > 0 && (
              <div className={`border-t ${isDark ? "border-white/8" : "border-gray-100"}`}>
                <p className={`text-xs px-4 pt-2 pb-1 ${isDark ? "text-white/40" : "text-gray-400"}`}>Existing folders</p>
                <div className="max-h-48 overflow-y-auto pb-2">
                  {allFolders.map(name => {
                    const c = colorForFolder(name);
                    return (
                      <button
                        key={name}
                        onClick={() => moveSelectedToFolder(name)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${isDark ? "hover:bg-white/6" : "hover:bg-gray-50"}`}
                      >
                        <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: c }} />
                        <span className={`flex-1 truncate ${isDark ? "text-white/80" : "text-gray-700"}`}>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Remove from folder */}
            <div className={`border-t px-4 py-2 ${isDark ? "border-white/8" : "border-gray-100"}`}>
              <button
                onClick={() => moveSelectedToFolder(null)}
                className="w-full flex items-center gap-2 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <FolderInput className="w-3.5 h-3.5" /> Remove from folder
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PullToRefresh>
  );
}