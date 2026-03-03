import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import BackButton from "./BackButton";
import { roleMeta, roleDefaults } from "../config/navigation";
import { getHierarchyForBranch } from "../selectors/demoSelectors";
import PhoneInput from "./PhoneInput";

function getInitials(displayName) {
  if (!displayName || typeof displayName !== "string") return "?";
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export default function ProfileView() {
  const { userProfile, updateProfile } = useAuth();
  const { role, navigateTo } = useApp();
  const [phone, setPhone] = useState(userProfile?.phone ?? "");
  const [displayName, setDisplayName] = useState(userProfile?.displayName ?? "");
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    setPhone(userProfile?.phone ?? "");
    setDisplayName(userProfile?.displayName ?? "");
  }, [userProfile?.phone, userProfile?.displayName]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const hierarchy = userProfile?.branch ? getHierarchyForBranch(userProfile.branch) : null;

  const handleSave = useCallback(async (fields) => {
    setSaveError(null);
    setSaving(true);
    try {
      await updateProfile(fields);
      setEditingName(false);
    } catch (err) {
      setSaveError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [updateProfile]);

  const handleSavePhone = useCallback(() => {
    handleSave({ phone: phone?.trim() || null });
  }, [phone, handleSave]);

  const handleSaveName = useCallback(() => {
    if (!displayName.trim()) {
      setSaveError("Display name cannot be empty");
      return;
    }
    handleSave({ display_name: displayName.trim() });
  }, [displayName, handleSave]);

  if (!userProfile) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--neutral-600)]">
        No profile data available.
      </div>
    );
  }

  const roleLabel = userProfile.title ?? roleMeta[userProfile.role]?.profileLabel ?? roleMeta[userProfile.role]?.label ?? userProfile.role;
  const initials = getInitials(userProfile.displayName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="max-w-xl"
    >
      <BackButton
        onClick={() => navigateTo(role ? roleDefaults[role] : "bm-dashboard")}
        label="Back"
        className="mb-6"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="w-16 h-16 rounded-full bg-[var(--hertz-primary)] text-[var(--hertz-black)] text-xl font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--hertz-black)] tracking-tight">
              {userProfile.displayName}
            </h1>
            <p className="text-sm text-[var(--neutral-600)] mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <div className="w-16 h-1 bg-[var(--hertz-primary)] origin-left" />

        {/* Details */}
        <div className="space-y-4 bg-[var(--neutral-50)] rounded-[var(--radius-lg)] p-6 border border-[var(--neutral-200)]">
          <h2 className="text-sm font-semibold text-[var(--hertz-black)] uppercase tracking-wider">
            Account details
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-[var(--neutral-600)] uppercase tracking-wide mb-1">Display name</dt>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setSaveError(null); }}
                    className="flex-1 border border-[var(--neutral-200)] rounded-md px-3 py-2 text-sm bg-white focus:border-[var(--hertz-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--hertz-primary)]"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setDisplayName(userProfile?.displayName ?? ""); } }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="px-3 py-2 text-sm font-semibold bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-[var(--radius-md)] hover:bg-[var(--hertz-primary-hover)] disabled:opacity-60 transition-colors shrink-0"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setDisplayName(userProfile?.displayName ?? ""); }}
                    className="px-3 py-2 text-sm font-medium text-[var(--neutral-600)] hover:text-[var(--hertz-black)] transition-colors shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <dd className="flex items-center gap-2">
                  <span className="text-base font-medium text-[var(--hertz-black)]">{userProfile.displayName}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1 text-[var(--neutral-400)] hover:text-[var(--hertz-black)] transition-colors"
                    title="Edit display name"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-[var(--neutral-600)] uppercase tracking-wide">Role</dt>
              <dd className="mt-1 text-base font-medium text-[var(--hertz-black)]">
                {roleLabel}
              </dd>
            </div>
            {userProfile.branch && (
              <div>
                <dt className="text-xs text-[var(--neutral-600)] uppercase tracking-wide">Branch</dt>
                <dd className="mt-1 text-base font-medium text-[var(--hertz-black)]">
                  {userProfile.branch}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-[var(--neutral-600)] uppercase tracking-wide mb-2">
                Phone
              </dt>
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex-1 min-w-[200px]">
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    showHint={true}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSavePhone}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-[var(--radius-md)] hover:bg-[var(--hertz-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              {saveError && (
                <p className="mt-2 text-sm text-[var(--color-error)]">{saveError}</p>
              )}
            </div>
            {userProfile.email && (
              <div>
                <dt className="text-xs text-[var(--neutral-600)] uppercase tracking-wide">Email</dt>
                <dd className="mt-1 text-base font-medium text-[var(--hertz-black)] font-mono break-all">
                  {userProfile.email}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Branch hierarchy */}
        {hierarchy && (
          <div className="bg-[var(--neutral-50)] rounded-[var(--radius-lg)] p-6 border border-[var(--neutral-200)]">
            <h2 className="text-sm font-semibold text-[var(--hertz-black)] uppercase tracking-wider mb-4">
              Reporting hierarchy
            </h2>
            <div className="flex items-center gap-3">
              {[
                { label: "Branch", value: hierarchy.branch },
                { label: "Area Manager", value: hierarchy.am },
                { label: "General Manager", value: hierarchy.gm },
                { label: "Zone", value: hierarchy.zone },
              ].filter((h) => h.value).map((h, i, arr) => (
                <div key={h.label} className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-[var(--neutral-500)] uppercase tracking-wide">{h.label}</p>
                    <p className="text-sm font-semibold text-[var(--hertz-black)]">{h.value}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <svg className="w-4 h-4 text-[var(--neutral-300)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
