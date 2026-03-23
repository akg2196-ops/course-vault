"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";

export interface WorkshopProgressProps {
  currentStep: 1 | 2 | 3 | 4;
}

const STEPS: Array<{ step: 1 | 2 | 3 | 4; label: string }> = [
  { step: 1, label: "Upload syllabus" },
  { step: 2, label: "Chapters" },
  { step: 3, label: "Topics" },
  { step: 4, label: "Concepts" },
];

export function WorkshopProgress({ currentStep }: WorkshopProgressProps) {
  return (
    <div className="w-full bg-white border-b border-gray-100 px-8 py-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {STEPS.map(({ step, label }, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const pillClass = isCompleted
            ? "inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-700"
            : isCurrent
              ? "inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              : "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs text-gray-400";

          return (
            <Fragment key={step}>
              {index > 0 ? (
                <span className="text-xs text-gray-300" aria-hidden>
                  →
                </span>
              ) : null}
              <span className={pillClass}>
                {isCompleted ? <Check className="shrink-0" size={10} strokeWidth={2.5} aria-hidden /> : null}
                <span>
                  {step} {label}
                </span>
              </span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
