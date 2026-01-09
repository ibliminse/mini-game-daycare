'use client';

import { LEVELS, COLORS, FORMS_PER_ROOM } from '@/game/config';

export default function AdminStatsTab() {
  return (
    <section id="stats-panel" role="tabpanel" aria-labelledby="stats-tab">
      <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.uiPaper }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
          Game Statistics
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: COLORS.uiBlue }}>
            <div className="text-3xl font-bold text-white">{LEVELS.length}</div>
            <div className="text-sm text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Total Levels</div>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: COLORS.uiGreen }}>
            <div className="text-3xl font-bold text-white">
              {LEVELS.reduce((sum, l) => sum + l.classrooms.length, 0)}
            </div>
            <div className="text-sm text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Total Classrooms</div>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: COLORS.uiYellow }}>
            <div className="text-3xl font-bold" style={{ color: '#333' }}>
              {LEVELS.reduce((sum, l) => sum + l.classrooms.length * FORMS_PER_ROOM, 0)}
            </div>
            <div className="text-sm" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>Total Forms</div>
          </div>
          <div className="p-4 rounded-lg text-center" style={{ backgroundColor: COLORS.uiPink }}>
            <div className="text-3xl font-bold text-white">
              ${LEVELS.reduce((sum, l) => sum + l.classrooms.length * FORMS_PER_ROOM * 5, 0)}
            </div>
            <div className="text-sm text-white/80" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Max Funding</div>
          </div>
        </div>

        <h3 className="font-bold mb-2" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
          Level Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            <thead>
              <tr style={{ backgroundColor: COLORS.uiBlue, color: 'white' }}>
                <th className="p-2 text-left">Level</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-center">Rooms</th>
                <th className="p-2 text-center">Forms</th>
                <th className="p-2 text-center">Hallways</th>
                <th className="p-2 text-center">Max $</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((level, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{level.name}</td>
                  <td className="p-2 text-center">{level.classrooms.length}</td>
                  <td className="p-2 text-center">{level.classrooms.length * FORMS_PER_ROOM}</td>
                  <td className="p-2 text-center">
                    {1 +
                      (('hallway2' in level && level.hallway2) ? 1 : 0) +
                      (('hallway3' in level && level.hallway3) ? 1 : 0) +
                      (('hallway4' in level && level.hallway4) ? 1 : 0) +
                      (('hallway5' in level && level.hallway5) ? 1 : 0)
                    }
                  </td>
                  <td className="p-2 text-center">${level.classrooms.length * FORMS_PER_ROOM * 5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
