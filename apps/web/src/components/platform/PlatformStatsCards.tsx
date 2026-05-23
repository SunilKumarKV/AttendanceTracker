import React from 'react';
import { Building2, ShieldCheck, Users } from 'lucide-react';
import type { PlatformDashboardData } from '../../api/platform';

interface PlatformStatsCardsProps {
  dashboard: PlatformDashboardData | null;
}

export const PlatformStatsCards: React.FC<PlatformStatsCardsProps> = ({ dashboard }) => {
  const cards = [
    { label: 'Institutions', value: dashboard?.totalInstitutions ?? 0, icon: Building2 },
    { label: 'Active', value: dashboard?.activeInstitutions ?? 0, icon: ShieldCheck },
    { label: 'Users', value: dashboard?.totalUsers ?? 0, icon: Users },
    { label: 'Students', value: dashboard?.totalStudents ?? 0, icon: Users },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <card.icon className="mb-3 text-blue-600" />
          <p className="text-sm font-bold text-slate-500">{card.label}</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
};
