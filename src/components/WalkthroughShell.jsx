import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BackButton from "./BackButton";

export default function WalkthroughShell({ steps, title, onBack }) {
  const [currentStep, setCurrentStep] = useState(0);
  const total = steps.length;

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const StepComponent = steps[currentStep];

  return (
    <div className="h-full bg-white flex flex-col relative">
      <div className="px-8 py-4 flex items-center justify-between">
        <BackButton onClick={onBack} label="Back to Interactive Demo" className="mb-0" />
        <span className="text-[#6E6E6E] text-sm">{title}</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 px-16 py-8"
          >
            <StepComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {currentStep > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#E6E6E6] hover:bg-[#FFD100] flex items-center justify-center text-[#1A1A1A] opacity-40 hover:opacity-100 transition-opacity cursor-pointer z-10"
        >
          ‹
        </button>
      )}
      {currentStep < total - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#E6E6E6] hover:bg-[#FFD100] flex items-center justify-center text-[#1A1A1A] opacity-40 hover:opacity-100 transition-opacity cursor-pointer z-10"
        >
          ›
        </button>
      )}

      <div className="px-8 py-4 flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors cursor-pointer ${
              i === currentStep
                ? "bg-[#FFD100]"
                : i < currentStep
                ? "bg-[#1A1A1A]"
                : "bg-[#E6E6E6]"
            }`}
          />
        ))}
        <span className="ml-4 text-xs text-[#6E6E6E]">
          {currentStep + 1} of {total}
        </span>
      </div>
    </div>
  );
}
