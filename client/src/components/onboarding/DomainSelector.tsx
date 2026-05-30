/**
 * client/src/components/onboarding/DomainSelector.tsx
 *
 * Multi-select domain picker used in the onboarding flow and settings.
 *
 * What this component will do:
 *  - Display all 5 domains as selectable cards (business, science, history, abstract, social).
 *  - Allow toggling individual domains on/off.
 *  - Enforce a minimum of 1 domain selected.
 *  - Accept: selected: Domain[], onChange: (domains: Domain[]) => void.
 *  - Show domain descriptions to help users choose.
 */

import type { Domain } from "@/types";
import { DOMAINS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DomainSelectorProps {
  selected: Domain[];
  onChange: (domains: Domain[]) => void;
}

export default function DomainSelector({ selected, onChange }: DomainSelectorProps) {
  const toggle = (domain: Domain) => {
    const isSelected = selected.includes(domain);
    if (isSelected) {
      const next = selected.filter((d) => d !== domain);
      if (next.length > 0) onChange(next);
      return;
    }
    onChange([...selected, domain]);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {DOMAINS.map((d) => {
        const isSelected = selected.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => toggle(d.value)}
            className={cn(
              "rounded-xl border p-4 text-left space-y-1 transition-all",
              isSelected
                ? "border-indigo-500 bg-indigo-500/15"
                : "border-white/10 bg-white/4 hover:border-white/20"
            )}
          >
            <div className="text-xl">{d.emoji}</div>
            <div className={cn("text-sm font-semibold", isSelected ? "text-white" : "text-slate-300")}>
              {d.label}
            </div>
            <div className="text-xs text-slate-500">{d.description}</div>
          </button>
        );
      })}
    </div>
  );
}
