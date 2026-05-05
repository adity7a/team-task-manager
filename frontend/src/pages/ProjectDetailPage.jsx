import React from "react";
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { formatDate } from '../utils/helpers'
import {
  ArrowLeft, Users, Plus, Trash2, Shield, UserCheck,
  ListTodo, Settings, X, ChevronRight
} from 'lucide-react'

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role })
      onAdd(res.data)
      toast.success('Member added!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold">Add Member</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="team@example.com"
              required
            />
            <p className="text-xs text-gray-400 mt-1">User must already have a TaskFlow account</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:bg-primary-400"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)

  const load = () => {
    api.get(`/projects/${id}`).then(r => {
      setProject(r.data.project)
      setMembers(r.data.members || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  const myRole = members.find(m => m.user?.id === user?.id)?.role || (project?.owner_id === user?.id ? 'admin' : 'member')
  const isAdmin = myRole === 'admin' || project?.owner_id === user?.id

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return
    try {
      await api.delete(`/projects/${id}/members/${userId}`)
      setMembers(m => m.filter(x => x.user.id !== userId))
      toast.success('Member removed')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/projects/${id}/members/${userId}/role?role=${newRole}`)
      setMembers(m => m.map(x => x.user.id === userId ? { ...x, role: newRole } : x))
      toast.success('Role updated')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-gray-100 rounded w-32" />
      <div className="h-32 bg-gray-100 rounded-xl" />
    </div>
  )

  if (!project) return (
    <div className="p-6 text-center py-20">
      <p className="text-gray-400">Project not found</p>
      <Link to="/projects" className="text-primary-600 text-sm mt-2 inline-block">← Back to projects</Link>
    </div>
  )

  const progress = project.task_count > 0 ? Math.round((project.done_count / project.task_count) * 100) : 0

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Back + Header */}
      <div>
        <Link to="/projects" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Projects
        </Link>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ background: project.color }}>
                {project.name[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
              </div>
            </div>
            <Link
              to={`/projects/${id}/tasks`}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shrink-0"
            >
              <ListTodo size={16} />
              View Tasks
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-50">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{project.task_count}</p>
              <p className="text-xs text-gray-400">Total Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{project.done_count}</p>
              <p className="text-xs text-gray-400">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{progress}%</p>
              <p className="text-xs text-gray-400">Progress</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: project.color }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary-500" />
            <h2 className="font-semibold text-gray-900">Team Members</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{members.length}</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus size={14} />
              Add Member
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-6 py-4">
              <img
                src={m.user?.avatar}
                alt={m.user?.name}
                className="w-9 h-9 rounded-full bg-gray-100"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {m.user?.name}
                  {m.user?.id === user?.id && <span className="text-xs text-gray-400 ml-1">(you)</span>}
                  {m.user?.id === project.owner_id && <span className="text-xs text-amber-500 ml-1">Owner</span>}
                </p>
                <p className="text-xs text-gray-400">{m.user?.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && m.user?.id !== project.owner_id && m.user?.id !== user?.id ? (
                  <>
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.user.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(m.user.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    m.role === 'admin' ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {m.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowAddMember(false)}
          onAdd={(m) => setMembers(prev => [...prev, m])}
        />
      )}
    </div>
  )
}