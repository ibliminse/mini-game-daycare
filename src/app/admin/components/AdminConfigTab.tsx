'use client';

import { COLORS, INSPECTION_TIME, PLAYER_SPEED, CARRY_CAPACITY, MAX_CARRY_CAPACITY, FORMS_PER_ROOM, INITIAL_SUSPICION, LOSE_THRESHOLD, SUSPICION_REDUCTION_PER_FORM, ICE_AGENT, UPGRADE_COSTS, SPRINT_DURATION, SPRINT_SPEED_MULTIPLIER, NO_ICE_DURATION } from '@/game/config';
import { EditableConfig } from './types';

interface AdminConfigTabProps {
  config: EditableConfig;
  onConfigChange: (key: keyof EditableConfig, value: number) => void;
  onGoToMaps: () => void;
  onSaveConfig?: () => void;
  configSaved?: boolean;
}

export default function AdminConfigTab({ config, onConfigChange, onGoToMaps, onSaveConfig, configSaved }: AdminConfigTabProps) {
  const resetToDefaults = () => {
    onConfigChange('inspectionTime', INSPECTION_TIME);
    onConfigChange('playerSpeed', PLAYER_SPEED);
    onConfigChange('carryCapacity', CARRY_CAPACITY);
    onConfigChange('maxCarryCapacity', MAX_CARRY_CAPACITY);
    onConfigChange('formsPerRoom', FORMS_PER_ROOM);
    onConfigChange('initialSuspicion', INITIAL_SUSPICION);
    onConfigChange('loseThreshold', LOSE_THRESHOLD);
    onConfigChange('suspicionReductionPerForm', SUSPICION_REDUCTION_PER_FORM);
    onConfigChange('iceSpeed', ICE_AGENT.speed);
    onConfigChange('iceDuration', ICE_AGENT.duration);
    onConfigChange('iceSpawnInterval', ICE_AGENT.spawnInterval);
    onConfigChange('iceWarningTime', ICE_AGENT.warningTime);
    onConfigChange('iceVisionDistance', ICE_AGENT.visionDistance);
    onConfigChange('iceVisionAngle', ICE_AGENT.visionAngle);
    onConfigChange('upgradeCapacityCost', UPGRADE_COSTS.carryCapacity);
    onConfigChange('upgradeSprintCost', UPGRADE_COSTS.sprint);
    onConfigChange('upgradeNoIceCost', UPGRADE_COSTS.noIce);
    onConfigChange('sprintDuration', SPRINT_DURATION);
    onConfigChange('sprintMultiplier', SPRINT_SPEED_MULTIPLIER);
    onConfigChange('noIceDuration', NO_ICE_DURATION);
  };

  return (
    <section id="config-panel" role="tabpanel" aria-labelledby="config-tab">
      <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.uiPaper }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
            Game Configuration (Editable)
          </h2>
          <div className="flex gap-2">
            {onSaveConfig && (
              <button
                onClick={onSaveConfig}
                className="px-3 py-1 text-sm font-bold rounded hover:scale-105 transition-transform text-white"
                style={{ backgroundColor: configSaved ? COLORS.uiGreen : COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}
              >
                {configSaved ? '✓ Saved!' : '💾 Save Permanently'}
              </button>
            )}
            <button
              onClick={resetToDefaults}
              className="px-3 py-1 text-sm font-bold rounded hover:scale-105 transition-transform"
              style={{ backgroundColor: COLORS.uiYellow, fontFamily: 'Comic Sans MS, cursive' }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <p className="text-sm mb-4 text-gray-600" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          Edit values below. Click &quot;Save Permanently&quot; to keep changes, or use &quot;Play Test&quot; to test first.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Timer & Player */}
          <div className="p-4 rounded-lg border-2" style={{ borderColor: COLORS.uiBlue }}>
            <h3 className="font-bold mb-3" style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiBlue }}>
              Timer &amp; Player
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Inspection Time (seconds)</label>
                <input
                  type="number"
                  value={config.inspectionTime}
                  onChange={(e) => onConfigChange('inspectionTime', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Player Speed (px/s)</label>
                <input
                  type="number"
                  value={config.playerSpeed}
                  onChange={(e) => onConfigChange('playerSpeed', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Base Carry Capacity</label>
                <input
                  type="number"
                  value={config.carryCapacity}
                  onChange={(e) => onConfigChange('carryCapacity', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Max Carry Capacity</label>
                <input
                  type="number"
                  value={config.maxCarryCapacity}
                  onChange={(e) => onConfigChange('maxCarryCapacity', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Suspicion */}
          <div className="p-4 rounded-lg border-2" style={{ borderColor: COLORS.uiGreen }}>
            <h3 className="font-bold mb-3" style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiGreen }}>
              Suspicion
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Starting Suspicion (%)</label>
                <input
                  type="number"
                  value={config.initialSuspicion}
                  onChange={(e) => onConfigChange('initialSuspicion', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Win Threshold (&le;%)</label>
                <input
                  type="number"
                  value={config.loseThreshold}
                  onChange={(e) => onConfigChange('loseThreshold', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Reduction Per Form (%)</label>
                <input
                  type="number"
                  value={config.suspicionReductionPerForm}
                  onChange={(e) => onConfigChange('suspicionReductionPerForm', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Forms Per Room</label>
                <input
                  type="number"
                  value={config.formsPerRoom}
                  onChange={(e) => onConfigChange('formsPerRoom', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* ICE Agent */}
          <div className="p-4 rounded-lg border-2" style={{ borderColor: COLORS.uiRed }}>
            <h3 className="font-bold mb-3" style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiRed }}>
              ICE Agent
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Speed (px/s)</label>
                <input
                  type="number"
                  value={config.iceSpeed}
                  onChange={(e) => onConfigChange('iceSpeed', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Patrol Duration (s)</label>
                <input
                  type="number"
                  value={config.iceDuration}
                  onChange={(e) => onConfigChange('iceDuration', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Spawn Interval (s)</label>
                <input
                  type="number"
                  value={config.iceSpawnInterval}
                  onChange={(e) => onConfigChange('iceSpawnInterval', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Warning Time (s)</label>
                <input
                  type="number"
                  value={config.iceWarningTime}
                  onChange={(e) => onConfigChange('iceWarningTime', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Vision Distance (px)</label>
                <input
                  type="number"
                  value={config.iceVisionDistance}
                  onChange={(e) => onConfigChange('iceVisionDistance', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Vision Angle (deg)</label>
                <input
                  type="number"
                  value={config.iceVisionAngle}
                  onChange={(e) => onConfigChange('iceVisionAngle', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Upgrades */}
          <div className="p-4 rounded-lg border-2" style={{ borderColor: COLORS.uiPink }}>
            <h3 className="font-bold mb-3" style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiPink }}>
              Upgrade Costs
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Capacity Cost ($)</label>
                <input
                  type="number"
                  value={config.upgradeCapacityCost}
                  onChange={(e) => onConfigChange('upgradeCapacityCost', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Sprint Cost ($)</label>
                <input
                  type="number"
                  value={config.upgradeSprintCost}
                  onChange={(e) => onConfigChange('upgradeSprintCost', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">No ICE Cost ($)</label>
                <input
                  type="number"
                  value={config.upgradeNoIceCost}
                  onChange={(e) => onConfigChange('upgradeNoIceCost', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>

          {/* Power-ups */}
          <div className="p-4 rounded-lg border-2" style={{ borderColor: COLORS.uiYellow }}>
            <h3 className="font-bold mb-3" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
              Power-ups
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Sprint Duration (s)</label>
                <input
                  type="number"
                  value={config.sprintDuration}
                  onChange={(e) => onConfigChange('sprintDuration', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Sprint Speed Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.sprintMultiplier}
                  onChange={(e) => onConfigChange('sprintMultiplier', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">No ICE Duration (s)</label>
                <input
                  type="number"
                  value={config.noIceDuration}
                  onChange={(e) => onConfigChange('noIceDuration', Number(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Test button */}
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: COLORS.uiGreen }}>
          <p className="text-white mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            Ready to test? Select a level from the Maps tab and click &quot;Play Test&quot;
          </p>
          <button
            onClick={onGoToMaps}
            className="px-4 py-2 bg-white text-green-700 font-bold rounded hover:scale-105 transition-transform"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Go to Maps &rarr;
          </button>
        </div>
      </div>
    </section>
  );
}
