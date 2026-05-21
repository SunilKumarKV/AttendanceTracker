import React, { memo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ReportStudent } from '../api/reports';

interface ReportChartsProps {
  pieData: { name: string; value: number }[];
  visibleStudents: ReportStudent[];
}

export const ReportCharts = memo<ReportChartsProps>(({ pieData, visibleStudents }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Status Distribution</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={58} outerRadius={96}>
              {pieData.map((_, index) => <Cell key={index} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][index]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Attendance Comparison</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleStudents.slice(0, 12)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="studentName" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="attendancePercentage" name="Attendance %" radius={[6, 6, 0, 0]}>
              {visibleStudents.slice(0, 12).map((student) => <Cell key={student.studentId} fill={student.status === 'Shortage' ? '#ef4444' : '#3b82f6'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
));
