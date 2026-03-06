import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getIssues, getProjects, getUsers } from '../services/api';
import { Download, ChevronDown, MoreHorizontal } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#1cca9b', '#0e2b3d', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Analytics = () => {
  const [period, setPeriod] = useState('Last 30 Days');
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [sprintFilter, setSprintFilter] = useState('Sprint 42');

  const { data: issuesResponse } = useQuery({
    queryKey: ['issues'],
    queryFn: () => getIssues().then((res) => res.data),
  });
  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects().then((res) => res.data),
  });
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers().then((res) => res.data),
  });

  const issues = Array.isArray(issuesResponse?.data) ? issuesResponse.data : Array.isArray(issuesResponse) ? issuesResponse : [];
  const projects = Array.isArray(projectsResponse?.data) ? projectsResponse.data : Array.isArray(projectsResponse) ? projectsResponse : [];
  const users = Array.isArray(usersData) ? usersData : usersData?.data || [];

  const doneCount = issues.filter((i) => i.status === 'done').length;
  const inProgressCount = issues.filter((i) => i.status === 'in_progress').length;
  const todoCount = issues.filter((i) => i.status === 'todo').length;
  const inReviewCount = issues.filter((i) => i.status === 'in_review').length;

  const distributionData = [
    { name: 'Done', value: doneCount, color: '#1cca9b' },
    { name: 'In Progress', value: inProgressCount, color: '#10b981' },
    { name: 'To Do', value: todoCount, color: '#f59e0b' },
    { name: 'In Review', value: inReviewCount, color: '#8b5cf6' },
  ].filter((d) => d.value > 0);

  const totalIssues = issues.length;
  const burndownDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const burndownData = burndownDays.map((day, i) => ({
    day,
    remaining: Math.max(0, totalIssues - i * 2 - Math.floor(Math.random() * 3)),
    ideal: totalIssues - (totalIssues / 7) * (i + 1),
  }));

  const velocityData = [
    { sprint: 'Sprint 39', commitment: 24, completed: 20 },
    { sprint: 'Sprint 40', commitment: 28, completed: 26 },
    { sprint: 'Sprint 41', commitment: 26, completed: 24 },
    { sprint: 'Sprint 42', commitment: 30, completed: 18 },
  ];

  const assigneeCounts = {};
  issues.forEach((issue) => {
    const list = issue.assignees?.length ? issue.assignees : issue.assignee ? [issue.assignee] : [];
    list.forEach((a) => {
      const name = a?.name || 'Unassigned';
      if (!assigneeCounts[name]) assigneeCounts[name] = 0;
      assigneeCounts[name]++;
    });
  });
  let workloadData = Object.entries(assigneeCounts)
    .slice(0, 5)
    .map(([name, count]) => ({ name: name.split(' ')[0], tasks: count, fill: COLORS[Math.floor(Math.random() * COLORS.length)] }));
  if (workloadData.length === 0 && issues.length > 0) {
    workloadData = [{ name: 'Unassigned', tasks: issues.length, fill: '#666' }];
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0e2b3d]">Analytics & Reports</h1>
          <p className="text-[#666] mt-1">Track project metrics and team performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0e2b3d] bg-white focus:ring-2 focus:ring-[#1cca9b] focus:border-[#1cca9b]"
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0e2b3d] bg-white focus:ring-2 focus:ring-[#1cca9b] focus:border-[#1cca9b]"
          >
            <option>All Projects</option>
            {projects.slice(0, 5).map((p) => (
              <option key={p._id}>{p.name}</option>
            ))}
          </select>
          <select
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0e2b3d] bg-white focus:ring-2 focus:ring-[#1cca9b] focus:border-[#1cca9b]"
          >
            <option>Sprint 42</option>
            <option>Sprint 41</option>
            <option>Sprint 40</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-[#0e2b3d] bg-white hover:bg-gray-50 flex items-center space-x-2">
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burn-down Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-[#0e2b3d]">Burn-down Chart</h2>
              <p className="text-sm text-[#666]">Current Sprint Progress</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#0e2b3d]">{totalIssues} Points</p>
              <p className="text-xs text-green-600">Remaining · 15%</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 12 }} />
                <YAxis tick={{ fill: '#666', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="remaining" stroke="#1cca9b" strokeWidth={2} dot={{ fill: '#1cca9b' }} />
                <Line type="monotone" dataKey="ideal" stroke="#ccc" strokeDasharray="5 5" strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#0e2b3d]">Issue Distribution</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              <MoreHorizontal size={18} className="text-[#666]" />
            </button>
          </div>
          <div className="flex items-center justify-center h-64">
            {distributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-[#666]">
                <p className="text-2xl font-bold text-[#0e2b3d]">{issues.length}</p>
                <p className="text-sm">TOTAL</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs">
            {distributionData.map((d) => (
              <span key={d.name} className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[#666]">{d.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Velocity Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#0e2b3d]">Velocity Chart</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              <MoreHorizontal size={18} className="text-[#666]" />
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            {velocityData.map((v) => (
              <button
                key={v.sprint}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${v.sprint === 'Sprint 42' ? 'bg-[#1cca9b] text-white' : 'bg-gray-100 text-[#666] hover:bg-gray-200'}`}
              >
                {v.sprint.replace('Sprint ', '')}
              </button>
            ))}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="sprint" tick={{ fill: '#666', fontSize: 11 }} />
                <YAxis tick={{ fill: '#666', fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="commitment" fill="#666" name="Commitment" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#1cca9b" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cycle Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-[#0e2b3d]">Cycle Time</h2>
              <p className="text-sm text-[#666]">Average days to completion</p>
            </div>
            <p className="text-xl font-bold text-[#1cca9b]">4.2 Days</p>
          </div>
          <div className="h-32 flex items-end">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData.slice(0, 5)}>
                <Line type="monotone" dataKey="remaining" stroke="#1cca9b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Workload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#0e2b3d]">Team Workload</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              <MoreHorizontal size={18} className="text-[#666]" />
            </button>
          </div>
          <div className="space-y-4">
            {workloadData.length > 0 ? (
              workloadData.map((member, i) => (
                <div key={member.name} className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-[#1cca9b] flex items-center justify-center text-white text-sm font-medium">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#0e2b3d] font-medium">{member.name}</span>
                      <span className="text-[#666]">{member.tasks} tasks</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (member.tasks / Math.max(...workloadData.map((m) => m.tasks), 1)) * 100)}%`,
                          backgroundColor: member.fill || '#1cca9b',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#666] text-sm">No assignee data yet. Assign issues to see workload.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
