'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useSimulationState } from '@/context/SimulationContext';
import { PipelineDisplay, type PipelineCell } from './PipelineDisplay';
import { PipelineHistory, type HistoryDict } from './PipelineHistory';

type StageName = 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';
const STAGES: StageName[] = ['IF', 'ID', 'EX', 'MEM', 'WB'];

type RegisterName = 'IF/ID' | 'ID/EX' | 'EX/MEM' | 'MEM/WB';

// Register view now mirrors same-index stage (fixes empty first cycle)
const REGISTER_FROM_STAGE: Array<{ name: RegisterName; from: StageName }> = [
  { name: 'IF/ID', from: 'IF' },
  { name: 'ID/EX', from: 'ID' },
  { name: 'EX/MEM', from: 'EX' },
  { name: 'MEM/WB', from: 'MEM' },
];

// Persisted storage across unmounts (view changes)
let persistedHistory: HistoryDict | null = null;
let persistedSig = '';
let persistedLastCycle = 0;

export default function NewPipelineVisualization() {
  const {
    instructions,
    instructionStages,
    currentCycle,
    isFinished,
  } = useSimulationState();

  const signature = useMemo(() => instructions.join('|'), [instructions]);

  // Initialize history from persisted (if same run)
  const [history, setHistory] = useState<HistoryDict>(() => {
    if (persistedHistory && persistedSig === signature) return persistedHistory;
    return { 'IF/ID': [], 'ID/EX': [], 'EX/MEM': [], 'MEM/WB': [] };
  });

  const lastCycleLoggedRef = useRef<number>(
    persistedSig === signature ? persistedLastCycle : 0
  );

  // listen hard reset from InstructionInput to clear persisted history
  useEffect(() => {
    const onHardReset = () => {
      persistedHistory = null;
      persistedSig = '';
      persistedLastCycle = 0;
      setHistory({ 'IF/ID': [], 'ID/EX': [], 'EX/MEM': [], 'MEM/WB': [] });
      lastCycleLoggedRef.current = 0;
    };
    window.addEventListener('pipeline:reset', onHardReset);
    return () => window.removeEventListener('pipeline:reset', onHardReset);
  }, []);

  // Reset persisted storage when simulation is cleared
  useEffect(() => {
    if (instructions.length === 0) {
      persistedHistory = null;
      persistedSig = '';
      persistedLastCycle = 0;
      setHistory({ 'IF/ID': [], 'ID/EX': [], 'EX/MEM': [], 'MEM/WB': [] });
      lastCycleLoggedRef.current = 0;
    }
  }, [instructions.length]);

  // Build current register view from stage map
  const pipelineNow: PipelineCell[] = useMemo(() => {
    const idxOf = (s: StageName) => STAGES.indexOf(s);

    return REGISTER_FROM_STAGE.map(({ name, from }) => {
      const fromIdx = idxOf(from);
      let hex: string | null = null;

      for (const [iStr, sIdx] of Object.entries(instructionStages)) {
        if (sIdx === fromIdx) {
          const i = Number(iStr);
          hex = instructions[i] ?? null;
          break;
        }
      }

      return { name, hex };
    });
  }, [instructionStages, instructions]);

  // Append history row on each new cycle. Persist across unmounts
  useEffect(() => {
    if (currentCycle <= 0) return;
    if (currentCycle === lastCycleLoggedRef.current) return;

    setHistory(prev => {
      const next: HistoryDict = {
        'IF/ID': [...prev['IF/ID']],
        'ID/EX': [...prev['ID/EX']],
        'EX/MEM': [...prev['EX/MEM']],
        'MEM/WB': [...prev['MEM/WB']],
      };

      pipelineNow.forEach(cell => {
        next[cell.name].push(cell.hex);
      });

      persistedHistory = next;
      persistedSig = signature;
      persistedLastCycle = currentCycle;

      return next;
    });

    lastCycleLoggedRef.current = currentCycle;
  }, [currentCycle, pipelineNow, signature]);

  const finished =
    isFinished ||
    (currentCycle > 0 &&
      pipelineNow.every(s => s.hex === null) &&
      currentCycle > instructions.length + 4);

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold font-headline">Pipeline Registers</h2>
            <div className="text-right">
              <div className="font-mono text-lg">Clock Cycle: {currentCycle}</div>
              {finished && <p className="text-primary font-semibold">Simulation Finished!</p>}
            </div>
          </div>
          <PipelineDisplay pipeline={pipelineNow} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold font-headline mb-4">Pipeline History</h2>
          <PipelineHistory history={history} />
        </CardContent>
      </Card>
    </div>
  );
}
