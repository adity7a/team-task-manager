import React from "react";
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '../utils/helpers'
import {
  LayoutDashboard, CheckCircle2, Clock, AlertTriangle,
  ListTodo, TrendingUp, FolderOpen, ChevronRight
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task }) {
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const overdue = isOverdue(task.due_date)
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
        {task.due_date && (
          <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {overdue ? '⚠ ' : ''}{formatDate(task.due_date)}
          </p>
        )}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${p.color}`}>{p.label}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  )

  const sc = data?.status_counts || {}
  const total = data?.total_tasks || 0
  const donePercent = total ? Math.round((sc.done || 0) / total * 100) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Here's what's happening with your projects today</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListTodo} label="Total Tasks" value={total} color="bg-primary-500" sub="All projects" />
        <StatCard icon={TrendingUp} label="In Progress" value={sc.in_progress || 0} color="bg-blue-500" sub="Active work" />
        <StatCard icon={CheckCircle2} label="Completed" value={sc.done || 0} color="bg-green-500" sub={`${donePercent}% done`} />
        <StatCard icon={AlertTriangle} label="Overdue" value={data?.overdue_count || 0} color="bg-red-500" sub="Need attention" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary-500" />
              <h2 className="font-semibold text-gray-900">My Tasks</h2>
            </div>
            <span className="text-xs text-gray-400">{data?.my_tasks?.length || 0} pending</span>
          </div>
          <div className="px-5 divide-y divide-gray-50">
            {data?.my_tasks?.length === 0 && (
              <div className="py-10 text-center">
                <CheckCircle2 size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No pending tasks. You're all caught up!</p>
              </div>
            )}
            {data?.my_tasks?.slice(0, 8).map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-primary-500" />
              <h2 className="font-semibold text-gray-900">Projects</h2>
            </div>
            <Link to="/projects" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="p-3 space-y-2">
            {data?.projects?.length === 0 && (
              <div className="py-8 text-center">
                <FolderOpen size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No projects yet</p>
                <Link to="/projects" className="text-xs text-primary-600 hover:underline mt-1 inline-block">Create one →</Link>
              </div>
            )}
            {data?.projects?.map(p => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="text-sm font-medium text-gray-800 truncate flex-1">{p.name}</span>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{p.progress}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{p.done_tasks}/{p.total_tasks} tasks</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Task Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{sc[status] || 0}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} mt-1 inline-block`}>
                {config.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}