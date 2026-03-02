/**
 * OnboardingTour — BM first-time user guided tour.
 * Hertz gold spotlight, step callouts, progress, Skip, quit confirmation.
 * Replay mode: no interactive gates, user can click Next freely.
 * Animations and delight: staggered entrances, micro-interactions, completion celebration.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { BM_ONBOARDING_STEPS } from "../config/onboardingSteps";

const OVERLAY_OPACITY = 0.55;
const SPOTLIGHT_PADDING = 8;
const EASE_OUT = [0.25, 1, 0.5, 1]; // ease-out-quart: refined, not bouncy

function Spotlight({ targetRect, reducedMotion }) {
  if (!targetRect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.25, ease: EASE_OUT }}
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: 9998 }}
      />
    );
  }
  const { top, left, width, height } = targetRect;
  const pad = SPOTLIGHT_PADDING;
  return (
    <motion.div
      className="fixed pointer-events-none"
      style={{
        zIndex: 9998,
        top: top - pad,
        left: left - pad,
        width: width + pad * 2,
        height: height + pad * 2,
        boxShadow: `0 0 0 9999px rgba(0,0,0,${OVERLAY_OPACITY})`,
        borderRadius: 8,
        border: "2px solid var(--hertz-primary)",
        animation: reducedMotion ? "none" : "onboarding-pulse 2.5s ease-in-out infinite",
      }}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    />
  );
}

function getCalloutPosition(targetRect) {
  if (!targetRect) {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const GAP = 16;
  const CALLOUT_WIDTH = 384;
  const pad = SPOTLIGHT_PADDING;

  const spaceBelow = vh - (targetRect.top + targetRect.height + pad);
  const spaceAbove = targetRect.top - pad;
  const spaceLeft = targetRect.left - pad;
  const spaceRight = vw - (targetRect.left + targetRect.width + pad);

  const style = {};

  if (spaceBelow >= 200) {
    style.top = `${targetRect.top + targetRect.height + pad + GAP}px`;
  } else if (spaceAbove >= 200) {
    style.top = `${Math.max(GAP, targetRect.top - pad - GAP - 220)}px`;
  } else if (spaceRight >= CALLOUT_WIDTH + GAP) {
    style.top = `${Math.max(GAP, targetRect.top)}px`;
    style.left = `${targetRect.left + targetRect.width + pad + GAP}px`;
    return style;
  } else if (spaceLeft >= CALLOUT_WIDTH + GAP) {
    style.top = `${Math.max(GAP, targetRect.top)}px`;
    style.left = `${Math.max(GAP, targetRect.left - pad - GAP - CALLOUT_WIDTH)}px`;
    return style;
  } else {
    style.top = `${GAP}px`;
  }

  const targetCenter = targetRect.left + targetRect.width / 2;
  let left = targetCenter - CALLOUT_WIDTH / 2;
  left = Math.max(GAP, Math.min(left, vw - CALLOUT_WIDTH - GAP));
  style.left = `${left}px`;

  return style;
}

function Callout({ step, stepIndex, totalSteps, onNext, onBack, onSkip, onQuit, canAdvance, isReplay, reducedMotion, targetRect }) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const isDone = step.id === "done";

  const btnHover = reducedMotion ? {} : { scale: 1.02 };
  const btnTap = reducedMotion ? {} : { scale: 0.98 };

  const positionStyle = getCalloutPosition(targetRect);

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{
        duration: reducedMotion ? 0.01 : 0.35,
        ease: EASE_OUT,
      }}
      className="fixed z-[10000] bg-white rounded-xl shadow-2xl border border-[var(--neutral-200)] max-w-sm w-[384px] p-6"
      style={{
        ...positionStyle,
        boxShadow: "0 24px 48px rgba(39,36,37,0.12), 0 0 0 1px rgba(39,36,37,0.04)",
      }}
    >
      {/* Accent bar on welcome and done */}
      {(isFirst || isDone) && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.4, delay: 0.1, ease: EASE_OUT }}
          className="absolute top-0 left-0 right-0 h-1 bg-[var(--hertz-primary)] rounded-t-xl origin-left"
        />
      )}

      {/* Skip */}
      <div className="absolute top-3 right-3">
        <motion.button
          onClick={onSkip}
          whileHover={btnHover}
          whileTap={btnTap}
          className="text-xs font-medium text-[var(--neutral-600)] hover:text-[var(--hertz-black)] transition-colors"
        >
          Skip tour
        </motion.button>
      </div>

      {/* Staggered content */}
      <motion.h3
        className="text-lg font-bold text-[var(--hertz-black)] pr-16"
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: reducedMotion ? 0 : 0.05, ease: EASE_OUT }}
      >
        {step.title}
      </motion.h3>
      <motion.p
        className="text-sm text-[var(--neutral-600)] mt-2 leading-relaxed"
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: reducedMotion ? 0 : 0.1, ease: EASE_OUT }}
      >
        {step.content}
      </motion.p>

      {/* Progress */}
      <motion.div
        className="mt-4 flex items-center gap-3"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: reducedMotion ? 0 : 0.15, ease: EASE_OUT }}
      >
        <div className="flex-1 h-2 bg-[var(--neutral-100)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[var(--hertz-primary)] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            transition={{ duration: reducedMotion ? 0.01 : 0.5, ease: EASE_OUT }}
          />
        </div>
        <span className="text-xs font-semibold text-[var(--neutral-600)] shrink-0 tabular-nums">
          {stepIndex + 1} / {totalSteps}
        </span>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="mt-4 flex items-center justify-between gap-2"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: reducedMotion ? 0 : 0.2, ease: EASE_OUT }}
      >
        <motion.button
          onClick={onQuit}
          whileHover={btnHover}
          whileTap={btnTap}
          className="p-1.5 rounded-lg text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors"
          title="Close"
          aria-label="Close tour"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
        <div className="flex gap-2">
          {!isFirst && (
            <motion.button
              onClick={onBack}
              whileHover={btnHover}
              whileTap={btnTap}
              className="px-3 py-2 text-sm font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
            >
              Back
            </motion.button>
          )}
          <motion.button
            onClick={onNext}
            disabled={!isReplay && !canAdvance && !!step.actionType}
            whileHover={!isReplay && !canAdvance && step.actionType ? {} : btnHover}
            whileTap={!isReplay && !canAdvance && step.actionType ? {} : btnTap}
            className="px-5 py-2 text-sm font-semibold bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg hover:bg-[var(--hertz-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isLast ? (isDone ? "Get started" : "Finish") : "Next"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuitConfirmModal({ onConfirm, onCancel, reducedMotion }) {
  const btnHover = reducedMotion ? {} : { scale: 1.02 };
  const btnTap = reducedMotion ? {} : { scale: 0.98 };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.01 : 0.2 }}
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.01 : 0.25, ease: EASE_OUT }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl border border-[var(--neutral-200)] p-6 max-w-sm mx-4"
      >
        <h3 className="text-lg font-bold text-[var(--hertz-black)]">Quit onboarding?</h3>
        <p className="text-sm text-[var(--neutral-600)] mt-2">
          Are you sure you want to quit? You can replay the tour anytime using the ? button.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <motion.button
            onClick={onCancel}
            whileHover={btnHover}
            whileTap={btnTap}
            className="px-4 py-2 text-sm font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] rounded-lg transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={onConfirm}
            whileHover={btnHover}
            whileTap={btnTap}
            className="px-4 py-2 text-sm font-medium bg-[var(--hertz-primary)] text-[var(--hertz-black)] rounded-lg hover:bg-[var(--hertz-primary-hover)] transition-colors"
          >
            Quit
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function OnboardingTour({
  open,
  onClose,
  onComplete,
  onSkip,
  isReplay = false,
  steps = BM_ONBOARDING_STEPS,
}) {
  const { navigateTo, activeView } = useApp();
  const reducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [actionCompleted, setActionCompleted] = useState({});
  const rafRef = useRef(null);

  const step = steps[stepIndex];
  const totalSteps = steps.length;
  const currentActionType = step?.actionType;
  const canAdvance = isReplay || !currentActionType || actionCompleted[currentActionType];

  const updateTargetRect = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setTargetRect(null);
    }
  }, [step?.target]);

  useEffect(() => {
    if (!open || !step) return;
    updateTargetRect();
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTargetRect);
    };
    window.addEventListener("scroll", onScroll, true);
    const root = document.getElementById("dashboard-scroll-root");
    if (root) {
      root.addEventListener("scroll", onScroll, { passive: true });
      const resizeObs = new ResizeObserver(updateTargetRect);
      resizeObs.observe(root);
      return () => {
        window.removeEventListener("scroll", onScroll, true);
        root.removeEventListener("scroll", onScroll);
        resizeObs.disconnect();
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, step, updateTargetRect]);

  // Navigate to required view when step changes
  useEffect(() => {
    if (!open || !step || activeView === step.requiredView) return;
    navigateTo(step.requiredView);
  }, [open, step?.requiredView, activeView, navigateTo]);

  // Auto-scroll target into view when step changes so spotlight isn't cut off
  useEffect(() => {
    if (!open || !step?.target) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const scrollDelay = 150;
    const rectRefreshDelay = reducedMotion ? 200 : 500; // after scroll settles
    const t1 = setTimeout(() => {
      el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    }, scrollDelay);
    const t2 = setTimeout(updateTargetRect, scrollDelay + rectRefreshDelay);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, step?.target, reducedMotion, updateTargetRect]);

  const handleNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      onComplete?.();
      onClose?.();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, totalSteps, onComplete, onClose]);

  const handleBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleSkip = useCallback(() => {
    onSkip?.();
    onClose?.();
  }, [onSkip, onClose]);

  const handleQuitClick = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const handleQuitConfirm = useCallback(() => {
    setShowQuitConfirm(false);
    onSkip?.();
    onClose?.();
  }, [onSkip, onClose]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitConfirm(false);
  }, []);

  // Interactive gates: when user completes action, mark done and auto-advance after brief delay
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const { actionType } = e.detail || {};
      if (actionType && actionType === currentActionType) {
        setActionCompleted((prev) => ({ ...prev, [actionType]: true }));
      }
    };
    window.addEventListener("onboarding:action", handler);
    return () => window.removeEventListener("onboarding:action", handler);
  }, [open, currentActionType]);

  // Auto-advance when action completed (delight: fluid progression)
  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;
  useEffect(() => {
    if (!open || !currentActionType || !actionCompleted[currentActionType]) return;
    const t = setTimeout(() => handleNextRef.current(), 600);
    return () => clearTimeout(t);
  }, [open, currentActionType, actionCompleted]);

  if (!open || !step) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes onboarding-pulse {
          0%, 100% {
            box-shadow: 0 0 0 9999px rgba(0,0,0,${OVERLAY_OPACITY});
            border-color: var(--hertz-primary);
          }
          50% {
            box-shadow: 0 0 0 9999px rgba(0,0,0,${OVERLAY_OPACITY}), 0 0 20px rgba(255,209,0,0.3);
            border-color: var(--hertz-primary);
          }
        }
      `}</style>
      <Spotlight targetRect={targetRect} reducedMotion={!!reducedMotion} />
      <AnimatePresence mode="wait">
        <Callout
          key={step.id}
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
          onQuit={handleQuitClick}
          canAdvance={canAdvance}
          isReplay={isReplay}
          reducedMotion={!!reducedMotion}
          targetRect={targetRect}
        />
      </AnimatePresence>
      <AnimatePresence>
        {showQuitConfirm && (
          <QuitConfirmModal
            onConfirm={handleQuitConfirm}
            onCancel={handleQuitCancel}
            reducedMotion={!!reducedMotion}
          />
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
