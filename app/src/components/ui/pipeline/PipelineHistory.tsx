'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Zap } from 'lucide-react';

export type RegisterName = 'IF/ID' | 'ID/EX' | 'EX/MEM' | 'MEM/WB';
export type HistoryEntry = { hex: string | null; idx: number | null };
export type HistoryDict = Record<RegisterName, HistoryEntry[]>;

type HazardType = 'RAW' | 'WAW' | 'NONE';

const stageDetails: Record<RegisterName, { name: string }> = {
  'IF/ID': { name: 'IF/ID Register' },
  'ID/EX': { name: 'ID/EX Register' },
  'EX/MEM': { name: 'EX/MEM Register' },
  'MEM/WB': { name: 'MEM/WB Register' },
};

const formatHex = (v: string | null) => {
  if (!v) return 'empty';
  const raw = v.startsWith('0x') ? v.slice(2) : v;
  if (raw.toLowerCase() === '00000000') return 'nop';
  return '0x' + raw.toLowerCase();
};

const Chip = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${className}`}>
    {children}
  </span>
);

export function PipelineHistory({
  history,
  hazards,
  forwardings,
  stalls,
}: {
  history: HistoryDict;
  hazards: Record<number, { type: HazardType }>;
  forwardings: Record<number, Array<any>>;
  stalls: Record<number, number>;
}) {
  const registers = Object.keys(history) as RegisterName[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {registers.map((reg) => (
        <div key={reg}>
          <h3 className="font-semibold text-center mb-2">{stageDetails[reg].name}</h3>
          <ScrollArea className="h-64 rounded-md border bg-muted/20">
            <div className="p-2 space-y-1">
              {history[reg].map((entry, index) => {
                const tag = entry.idx != null ? `[${entry.idx + 1}] ` : '';
                const hz = entry.idx != null ? hazards[entry.idx] : undefined;
                const hasFwd = entry.idx != null ? (forwardings[entry.idx]?.length ?? 0) > 0 : false;
                const stallCount = entry.idx != null ? (stalls[entry.idx] ?? 0) : 0;

                // background hues inline with display
                const rowTone =
                  stallCount > 0
                    ? 'bg-red-50'
                    : hasFwd
                    ? 'bg-green-50'
                    : hz?.type === 'RAW'
                    ? 'bg-rose-50'
                    : hz?.type === 'WAW'
                    ? 'bg-amber-50'
                    : 'bg-background';

                return (
                  <div
                    key={index}
                    className={`grid grid-cols-[1.5rem_1fr] items-center font-mono text-xs p-1.5 rounded-sm ${rowTone}`}
                  >
                    <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">
                        {entry.hex ? `${tag}${formatHex(entry.hex)}` : 'empty'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {hz?.type === 'RAW' && (
                          <Chip className="bg-rose-100 text-rose-700 border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> RAW
                          </Chip>
                        )}
                        {hz?.type === 'WAW' && (
                          <Chip className="bg-amber-100 text-amber-700 border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> WAW
                          </Chip>
                        )}
                        {stallCount > 0 && (
                          <Chip className="bg-red-100 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3" /> stall ×{stallCount}
                          </Chip>
                        )}
                        {hasFwd && (
                          <Chip className="bg-green-100 text-green-700 border-green-200">
                            <Zap className="w-3 h-3" /> fwd
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
