'use client';

import { useState, useEffect } from 'react';
import { COLORS } from '@/game/config';
import { ColorTheme, getSavedTheme, saveColorTheme, clearSavedTheme, getDefaultColors } from '@/game/storage';

interface AdminThemeTabProps {
  onThemeSaved?: () => void;
}

export default function AdminThemeTab({ onThemeSaved }: AdminThemeTabProps) {
  const [theme, setTheme] = useState<ColorTheme>(getDefaultColors());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedTheme = getSavedTheme();
    if (savedTheme) {
      setTheme(prev => ({ ...prev, ...savedTheme }));
    }
  }, []);

  const updateColor = (key: keyof ColorTheme, value: string) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveColorTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onThemeSaved?.();
  };

  const handleReset = () => {
    clearSavedTheme();
    setTheme(getDefaultColors());
    setSaved(false);
  };

  const colorGroups = [
    {
      title: 'Room Colors',
      icon: '🏠',
      borderColor: COLORS.uiBlue,
      colors: [
        { key: 'hallwayFloor' as const, label: 'Hallway Floor' },
        { key: 'classroomFloor' as const, label: 'Classroom Floor' },
        { key: 'officeFloor' as const, label: 'Office Floor' },
        { key: 'wall' as const, label: 'Wall' },
        { key: 'wallTrim' as const, label: 'Wall Trim' },
      ],
    },
    {
      title: 'Player Colors',
      icon: '🧑',
      borderColor: COLORS.uiGreen,
      colors: [
        { key: 'playerShirt' as const, label: 'Shirt' },
        { key: 'playerPants' as const, label: 'Pants' },
        { key: 'playerSkin' as const, label: 'Skin' },
      ],
    },
    {
      title: 'UI Colors',
      icon: '🎨',
      borderColor: COLORS.uiPink,
      colors: [
        { key: 'uiBlue' as const, label: 'Primary (Blue)' },
        { key: 'uiGreen' as const, label: 'Success (Green)' },
        { key: 'uiRed' as const, label: 'Danger (Red)' },
        { key: 'uiYellow' as const, label: 'Warning (Yellow)' },
        { key: 'uiPink' as const, label: 'Accent (Pink)' },
      ],
    },
  ];

  return (
    <section id="theme-panel" role="tabpanel" aria-labelledby="theme-tab">
      <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.uiPaper }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
            🎨 Color Theme Editor
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm font-bold rounded hover:scale-105 transition-transform text-white"
              style={{ backgroundColor: saved ? COLORS.uiGreen : COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}
            >
              {saved ? '✓ Saved!' : '💾 Save Theme'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm font-bold rounded hover:scale-105 transition-transform"
              style={{ backgroundColor: COLORS.uiYellow, fontFamily: 'Comic Sans MS, cursive' }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <p className="text-sm mb-4 text-gray-600" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          Customize the game&apos;s color palette. Changes are saved to your browser and will persist across sessions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {colorGroups.map((group) => (
            <div key={group.title} className="p-4 rounded-lg border-2" style={{ borderColor: group.borderColor }}>
              <h3 className="font-bold mb-3" style={{ fontFamily: 'Comic Sans MS, cursive', color: group.borderColor }}>
                {group.icon} {group.title}
              </h3>
              <div className="space-y-3">
                {group.colors.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme[key]}
                      onChange={(e) => updateColor(key, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-2 border-gray-300"
                    />
                    <div className="flex-1">
                      <label className="block text-xs font-bold mb-0.5">{label}</label>
                      <input
                        type="text"
                        value={theme[key]}
                        onChange={(e) => updateColor(key, e.target.value)}
                        className="w-full p-1 text-xs border rounded font-mono"
                        placeholder="#RRGGBB"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Preview Section */}
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#333' }}>
          <h3 className="font-bold mb-3 text-white" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            🖼️ Preview
          </h3>
          <div className="flex gap-4 flex-wrap">
            {/* Room preview */}
            <div className="flex gap-2">
              <div className="w-16 h-16 rounded border-2" style={{ backgroundColor: theme.hallwayFloor, borderColor: theme.wall }}>
                <div className="text-center text-xs mt-5 text-gray-700">Hall</div>
              </div>
              <div className="w-16 h-16 rounded border-2" style={{ backgroundColor: theme.classroomFloor, borderColor: theme.wall }}>
                <div className="text-center text-xs mt-5 text-gray-700">Room</div>
              </div>
              <div className="w-16 h-16 rounded border-2" style={{ backgroundColor: theme.officeFloor, borderColor: theme.wall }}>
                <div className="text-center text-xs mt-5 text-gray-700">Office</div>
              </div>
            </div>

            {/* Player preview */}
            <div className="flex flex-col items-center gap-1">
              <svg width="40" height="50" viewBox="0 0 40 50">
                {/* Head */}
                <circle cx="20" cy="12" r="10" fill={theme.playerSkin} />
                {/* Body */}
                <rect x="10" y="22" width="20" height="15" rx="3" fill={theme.playerShirt} />
                {/* Legs */}
                <rect x="12" y="37" width="7" height="12" rx="2" fill={theme.playerPants} />
                <rect x="21" y="37" width="7" height="12" rx="2" fill={theme.playerPants} />
              </svg>
              <span className="text-xs text-white">Player</span>
            </div>

            {/* UI buttons preview */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-1">
                <button className="px-2 py-1 text-xs text-white rounded" style={{ backgroundColor: theme.uiBlue }}>Blue</button>
                <button className="px-2 py-1 text-xs text-white rounded" style={{ backgroundColor: theme.uiGreen }}>Green</button>
              </div>
              <div className="flex gap-1">
                <button className="px-2 py-1 text-xs text-white rounded" style={{ backgroundColor: theme.uiRed }}>Red</button>
                <button className="px-2 py-1 text-xs rounded" style={{ backgroundColor: theme.uiYellow }}>Yellow</button>
              </div>
              <div className="flex gap-1">
                <button className="px-2 py-1 text-xs text-white rounded" style={{ backgroundColor: theme.uiPink }}>Pink</button>
              </div>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="mt-4 p-3 rounded" style={{ backgroundColor: COLORS.uiYellow + '30' }}>
          <p className="text-sm text-gray-700" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            💡 <strong>Tip:</strong> Theme changes will apply the next time you start a game. Reload the page to see updates in the admin panel.
          </p>
        </div>
      </div>
    </section>
  );
}
