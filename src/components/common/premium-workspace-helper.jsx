import React, { useState } from "react";
import { Sparkles, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export function PremiumWorkspaceHelper({ title, description, steps = [] }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="border border-dailyveg-200/50 bg-gradient-to-br from-white via-dailyveg-50/5 to-emerald-50/10 p-4 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900 relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
        <Sparkles className="h-32 w-32 text-dailyveg-600" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-dailyveg-50 text-dailyveg-600 dark:bg-dailyveg-950">
            <HelpCircle className="h-4.5 w-4.5" />
          </span>
          <div>
            <h4 className="font-extrabold text-sm text-slate-950 dark:text-white flex items-center gap-1.5">
              {title}
              <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md dark:bg-emerald-950 dark:text-emerald-300">
                Easy Guide
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">{description}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Hide Helper" : "Show Helper"}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && steps.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-3 bg-white/70 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-2.5 hover:border-dailyveg-300 dark:hover:border-dailyveg-900 transition-colors"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dailyveg-600 text-white font-black text-xs shadow-md shadow-dailyveg-500/20">
                {idx + 1}
              </span>
              <div className="text-xs">
                <span className="font-extrabold text-slate-950 dark:text-white block mb-0.5">
                  {step.title}
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  {step.instruction}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
