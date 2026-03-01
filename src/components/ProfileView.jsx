import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import BackButton from "./BackButton";
import { roleMeta, roleDefaults } from "../config/navigation";
import PhoneInput from "./PhoneInput";

/**
 * Derives initials from display name (e.g. "Sarah Chen" → "SC").
 */
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

  useEffect(() => {
    setPhone(userProfile?.phone ?? "");
  }, [userProfile?.phone]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSavePhone = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    try {
      await updateProfile({ phone: phone?.trim() || null });
    } catch (err) {
      setSaveError(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [phone, updateProfile]);

  if (!userProfile) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--neutral-600)]">
        No profile data available.
      </div>
    );
  }

  const roleLabel = roleMeta[userProfile.role]?.profileLabel ?? roleMeta[userProfile.role]?.label ?? userProfile.role;
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
          <span className="w-16 h-16 rounded-full bg-[var(--hertz-primary)] text-[var(--hertz-black)] text-xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </span>
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
              <dt className="text-xs text-[var(--neutral-600)] uppercase tracking-wide">Display name</dt>
              <dd className="mt-1 text-base font-medium text-[var(--hertz-black)]">
                {userProfile.displayName}
              </dd>
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
              <div className="flex flex-wrap items-center gap-2">
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
                  className="self-end px-4 py-2 text-sm font-semibold bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-[var(--radius-md)] hover:bg-[var(--hertz-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0"
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
      </div>
    </motion.div>
  );
}
