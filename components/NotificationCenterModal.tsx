import React, { useState, useEffect } from 'react';
import { AppNotification, User } from '../types';
import { X, Bell, CheckCheck, Trash2, Sparkles, ChevronRight, ArrowLeft, Calendar, Heart, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { calculateScheduledNotifications, getDefaultNotificationSettings, sanitizeUserNotifications } from '../services/notificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  setUser: (user: User) => void;
  syncUser: (user: User) => void;
  setActiveTab: (tab: string) => void;
  initialSelectedNotif?: AppNotification | null;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  user,
  setUser,
  syncUser,
  setActiveTab,
  initialSelectedNotif = null,
}) => {
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(initialSelectedNotif);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cycle' | 'wellness' | 'partner'>('all');

  const handleSyncNotificationsNow = async () => {
    const sanitizedNotifs = sanitizeUserNotifications(user);
    const scheduled = calculateScheduledNotifications(user, user.notificationSettings || getDefaultNotificationSettings());
    const updatedList = [...sanitizedNotifs];
    const nowISO = new Date().toISOString();

    if (scheduled && scheduled.length > 0) {
      scheduled.forEach(item => {
        if (!updatedList.some(n => n.id === item.id)) {
          updatedList.unshift({
            id: item.id,
            title: item.title,
            body: item.body,
            emoji: item.emoji,
            timestamp: nowISO,
            isRead: false,
            phaseInfo: item.phaseInfo,
            category: item.category,
            detailedTip: item.detailedTip,
            isPartner: item.isPartner
          });
        }
      });
    }

    const updatedUser = { ...user, notifications: updatedList };
    setUser(updatedUser);
    await syncUser(updatedUser);
  };

  useEffect(() => {
    if (isOpen) {
      if (!user?.notifications || user.notifications.length === 0) {
        handleSyncNotificationsNow();
      }
      if (initialSelectedNotif) {
        setSelectedNotif(initialSelectedNotif);
        if (!initialSelectedNotif.isRead && user) {
          const notifications = user.notifications || [];
          const updatedList = notifications.map(n => n.id === initialSelectedNotif.id ? { ...n, isRead: true } : n);
          const updatedUser = { ...user, notifications: updatedList };
          setUser(updatedUser);
          syncUser(updatedUser);
        }
      }
    } else {
      setSelectedNotif(null);
    }
  }, [isOpen, initialSelectedNotif]);

  // Ensure that if user has a pending partnerRequest or partnerId, a notification exists
  useEffect(() => {
    if (user && !user.isPartner && (user.partnerRequest?.status === 'pending' || (user.partnerId && !user.isPartnerLinked))) {
      const existingNotif = (user.notifications || []).some(n => 
        n.category === 'partner_request' || n.isPartnerRequest || (n.title && n.title.toLowerCase().includes('request'))
      );
      if (!existingNotif) {
        const partnerName = user.partnerRequest?.partnerName || user.partnerName || 'Your partner';
        const notifObj = {
          id: `notif_partner_req_${Date.now()}`,
          title: '💕 New Partner Connection Request',
          body: `${partnerName} requested to connect on Partner Mode. Tap to review and accept or decline.`,
          emoji: '💕',
          timestamp: new Date().toISOString(),
          isRead: false,
          category: 'partner_request',
          isPartnerRequest: true
        };
        const updatedUser = {
          ...user,
          notifications: [notifObj, ...(user.notifications || [])]
        };
        setUser(updatedUser);
        syncUser(updatedUser);
      }
    }
  }, [user?.partnerRequest?.status, user?.partnerId, user?.isPartner, user?.isPartnerLinked]);

  if (!isOpen) return null;

  // Filter notifications in User Mode (!user?.isPartner)
  const allNotifications = user?.notifications || [];
  const notifications = allNotifications.filter(n => {
    if (!user?.isPartner) {
      // ALWAYS keep partner requests, invites, and connection notifications visible!
      const isConnectionRequest = n.category === 'partner_request' || 
                                  n.isPartnerRequest === true ||
                                  (n.title && (n.title.toLowerCase().includes('request') || n.title.toLowerCase().includes('invite') || n.title.toLowerCase().includes('connection') || n.title.toLowerCase().includes('linked')));
      if (isConnectionRequest) return true;

      // Filter out general partner-mode tips/reminders
      const isPartnerNotif = n.category === 'partner' || n.isPartner === true;
      return !isPartnerNotif;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const availableCategories: Array<{ id: 'all' | 'cycle' | 'wellness' | 'partner'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'partner', label: user?.isPartner ? 'Partner Updates' : 'Partner Requests' },
    { id: 'cycle', label: 'Cycle & Phase' },
    { id: 'wellness', label: 'Wellness' },
  ];

  const filteredNotifications = notifications.filter(n => {
    if (categoryFilter === 'cycle') return n.category === 'cycle' || n.category === 'pregnancy' || n.title.toLowerCase().includes('phase') || n.title.toLowerCase().includes('period') || n.title.toLowerCase().includes('ovulation') || n.title.toLowerCase().includes('growth');
    if (categoryFilter === 'wellness') return n.category === 'wellness' || n.category === 'symptom' || n.category === 'mood' || n.title.toLowerCase().includes('water') || n.title.toLowerCase().includes('hydration') || n.title.toLowerCase().includes('medication');
    if (categoryFilter === 'partner') return n.category === 'partner' || n.category === 'partner_request' || n.isPartnerRequest || n.title.toLowerCase().includes('partner') || n.title.toLowerCase().includes('request') || n.title.toLowerCase().includes('invite') || n.title.toLowerCase().includes('companion') || n.isPartner;
    return true;
  });

  const handleSelectNotif = (notif: AppNotification) => {
    // Mark as read
    if (!notif.isRead) {
      const updatedList = (user?.notifications || []).map(n => n.id === notif.id ? { ...n, isRead: true } : n);
      const updatedUser = { ...user, notifications: updatedList };
      setUser(updatedUser);
      syncUser(updatedUser);
    }
    setSelectedNotif(notif);
  };

  const handleMarkAllRead = () => {
    const notifIdsToMark = new Set(notifications.map(n => n.id));
    const updated = (user?.notifications || []).map(n => notifIdsToMark.has(n.id) ? { ...n, isRead: true } : n);
    const updatedUser = { ...user, notifications: updated };
    setUser(updatedUser);
    syncUser(updatedUser);
  };

  const handleClearAll = () => {
    const notifIdsToRemove = new Set(notifications.map(n => n.id));
    const updated = (user?.notifications || []).filter(n => !notifIdsToRemove.has(n.id));
    const updatedUser = { ...user, notifications: updated };
    setUser(updatedUser);
    syncUser(updatedUser);
    setSelectedNotif(null);
  };

  const handleDeleteNotif = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = (user?.notifications || []).filter(n => n.id !== id);
    const updatedUser = { ...user, notifications: updatedList };
    setUser(updatedUser);
    syncUser(updatedUser);
    if (selectedNotif?.id === id) {
      setSelectedNotif(null);
    }
  };

  const handleActionClick = (notif: AppNotification) => {
    onClose();
    const text = (notif.title + ' ' + notif.body + ' ' + (notif.category || '')).toLowerCase();
    if (text.includes('diary') || text.includes('journal') || text.includes('whisper')) {
      setActiveTab('diary');
    } else if (text.includes('water') || text.includes('hydration') || text.includes('sip')) {
      setActiveTab('water');
    } else if (text.includes('partner') || text.includes('companion') || text.includes('request') || text.includes('invite') || notif.category === 'partner' || notif.category === 'partner_request' || notif.isPartnerRequest) {
      setActiveTab('partner');
      window.dispatchEvent(new CustomEvent('lumina-set-partner-subtab', { detail: 'requests' }));
    } else if (text.includes('medication') || text.includes('pill') || text.includes('vitamin')) {
      setActiveTab('settings');
    } else if (text.includes('music') || text.includes('song') || text.includes('sound')) {
      setActiveTab('music');
    } else if (text.includes('learn') || text.includes('edu') || text.includes('guide')) {
      setActiveTab('edu');
    } else if (text.includes('wellness') || text.includes('symptom') || text.includes('selfcare')) {
      setActiveTab('wellness');
    } else {
      setActiveTab('cycle');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex justify-end animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white flex justify-between items-center shadow-lg relative">
          <div className="flex items-center gap-3">
            {selectedNotif ? (
              <button
                onClick={() => setSelectedNotif(null)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                title="Back to list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
            )}
            <div>
              <h3 className="font-serif italic font-bold text-xl leading-tight">
                {selectedNotif ? 'Notification Details' : 'Notification Center'}
              </h3>
              <p className="text-xs text-pink-100 opacity-90">
                {selectedNotif
                  ? (selectedNotif.phaseInfo || 'Full Details')
                  : unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up ✨'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DETAILS VIEW */}
        {selectedNotif ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-pink-50/20 dark:bg-stone-950/40">
            {/* Header Badge & Emoji */}
            <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-stone-800 rounded-3xl border border-pink-100/60 dark:border-stone-700 shadow-sm relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-100 to-rose-100 dark:from-stone-700 dark:to-stone-600 flex items-center justify-center text-4xl mb-4 shadow-inner">
                {selectedNotif.emoji || '🌸'}
              </div>

              {selectedNotif.phaseInfo && (
                <span className="px-3.5 py-1 bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                  {selectedNotif.phaseInfo}
                </span>
              )}

              <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 leading-snug">
                {selectedNotif.title}
              </h2>

              <p className="text-xs text-stone-400 mt-2 font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-400" />
                {new Date(selectedNotif.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                {' • '}
                {new Date(selectedNotif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Message Body Box */}
            <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl border border-pink-100/60 dark:border-stone-700 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Message Content
              </h4>
              <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-serif italic text-base">
                "{selectedNotif.body}"
              </p>
            </div>

            {/* Phase Information & Detailed Wellness Tip */}
            <div className="bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-purple-500/10 p-6 rounded-3xl border border-pink-200/50 dark:border-pink-900/30 space-y-3">
              <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold text-xs uppercase tracking-wider">
                <Heart className="w-4 h-4 fill-pink-400/20" />
                <span>Phase Insights & Wellness Advice</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                {selectedNotif.detailedTip || selectedNotif.body}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleActionClick(selectedNotif)}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-pink-200/50 dark:shadow-none hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Relevant Feature</span>
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedNotif(null)}
                className="w-full py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-stone-200 transition-colors cursor-pointer"
              >
                Back to All Notifications
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Action Toolbar & Filters */}
            <div className="bg-pink-50/50 dark:bg-stone-800/60 border-b border-pink-100/30">
              <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide text-xs">
                {availableCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'bg-white dark:bg-stone-800 text-stone-500 hover:text-pink-600'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="px-4 py-2 flex justify-between items-center text-xs border-t border-pink-100/30">
                <button
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="text-pink-600 dark:text-pink-400 font-medium hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:no-underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                  className="text-stone-400 hover:text-rose-500 font-medium hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:no-underline"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="py-20 text-center text-stone-400 dark:text-stone-500 space-y-4">
                  <Sparkles className="w-10 h-10 mx-auto opacity-30 text-pink-400 animate-pulse" />
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-300">No notifications in this filter</p>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto">
                    Your daily phase notifications, wellness tips, and partner alerts are saved here automatically.
                  </p>
                  <button
                    onClick={handleSyncNotificationsNow}
                    className="px-4 py-2 bg-pink-50 dark:bg-stone-800 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-stone-700 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer border border-pink-100 dark:border-stone-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Daily Updates Now</span>
                  </button>
                </div>
              ) : (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleSelectNotif(notif)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                      !notif.isRead
                        ? 'bg-gradient-to-r from-pink-50/90 to-rose-50/40 dark:from-stone-800 dark:to-stone-800/80 border-pink-200/80 dark:border-pink-900/50 shadow-sm'
                        : 'bg-white dark:bg-stone-800/40 border-stone-100 dark:border-stone-800 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {!notif.isRead && (
                      <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    )}

                    <div className="flex items-start gap-3">
                      <span className="text-3xl flex-shrink-0 leading-none pt-0.5">{notif.emoji || '🌸'}</span>
                      <div className="flex-1 min-w-0 pr-3">
                        {notif.phaseInfo && (
                          <span className="inline-block px-2 py-0.5 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 rounded-md text-[9px] font-bold uppercase tracking-wider mb-1">
                            {notif.phaseInfo}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-stone-800 dark:text-stone-100 leading-snug">
                          {notif.title}
                        </h4>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 leading-relaxed line-clamp-2">
                          {notif.body}
                        </p>

                        {(notif.category === 'partner_request' || notif.isPartnerRequest || (notif.title && (notif.title.toLowerCase().includes('request') || notif.title.toLowerCase().includes('invite')))) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notif);
                            }}
                            className="mt-2.5 w-full py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Review & Approve Request 💖</span>
                          </button>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100 dark:border-stone-800/50">
                          <p className="text-[9px] text-stone-400 font-mono">
                            {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className="text-[10px] text-pink-500 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Tap to read <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotif(notif.id, e)}
                        className="text-stone-300 hover:text-rose-500 p-1.5 rounded-full transition-colors opacity-60 hover:opacity-100 hover:bg-stone-100 dark:hover:bg-stone-700"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
