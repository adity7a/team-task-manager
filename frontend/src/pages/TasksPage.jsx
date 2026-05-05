import React from "react";
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { PRIORITY_CONFIG, STATUS_CONFIG, formatDate, isOverdue } from '../utils/helpers'
import {
  ArrowLeft, Plus, X, Search, Filter, Calendar, User,
  AlertCircle, MessageSquare, Trash2, ChevronDown, Tag
} from 'lucide-react'

const STATUSES = ['todo', 'in_progress', 'review', 'done']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

function TaskModal({ task, projectId, members, onClose, onSave }) {
  const { user } = useAuth()
  const isNew = !task
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date || '',
  })
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    if (task?.id) {
      api.get(`/projects/${projectId}/tasks/${task.id}`)
        .then(r => setComments(r.data.comments || []))
    }
  }, [task?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setLoading(true)
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        due_date: form.due_date || null,
      }
      let res
      if (isNew) {
        res = await api.post(`/projects/${projectId}/tasks/`, payload)
      } else {
        res = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload)
      }
      onSave(res.data, !isNew)
      toast.success(isNew ? 'Task created!' : 'Task updated!')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: newComment })
      setComments(c => [...c, res.data])
      setNewComment('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-gray-900">{isNew ? 'New Task' : 'Edit Task'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        {!isNew && (
          <div className="flex border-b shrink-0">
            {['details', 'comments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'comments' && comments.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5">{comments.length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          {(isNew || activeTab === 'details') && (
            <form id="task-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full text-lg font-medium border-0 border-b border-gray-200 pb-2 focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="Task title..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">DESCRIPTION</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Add more details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">STATUS</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">PRIORITY</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">ASSIGNEE</label>
                  <select
                    value={form.assignee_id}
                    onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">DUE DATE</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </form>
          )}

          {!isNew && activeTab === 'comments' && (
            <div className="p-6 space-y-4">
              {comments.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No comments yet. Start the conversation!</p>
                </div>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <img src={c.user?.avatar} alt={c.user?.name} className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-lg px-4 py-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">{c.user?.name}</p>
                      <p className="text-sm text-gray-600">{c.content}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 px-1">{formatDate(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 shrink-0">
          {!isNew && activeTab === 'comments' ? (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Write a comment..."
              />
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
                Send
              </button>
            </form>
          ) : (
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-100">
                Cancel
              </button>
              <button
                form="task-form"
                type="submit"
                disabled={loading}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:bg-primary-400 hover:bg-primary-700"
              >
                {loading ? 'Saving...' : isNew ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete, isAdmin, userId }) {
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const s = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  const overdue = isOverdue(task.due_date) && task.status !== 'done'
  const canDelete = task.created_by === userId || isAdmin

  return (
    <div
      onClick={() => onEdit(task)}
      className="bg-white border border-gray-100 rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-gray-800 leading-tight flex-1">{task.title}</h4>
        {canDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(task.id) }}
            className="p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${p.color}`}>{p.label}</span>
        {task.due_date && (
          <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {overdue && <AlertCircle size={11} />}
            <Calendar size={11} />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <img src={task.assignee.avatar} className="w-5 h-5 rounded-full" alt={task.assignee.name} />
            <span className="text-xs text-gray-400 truncate max-w-24">{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">Unassigned</span>
        )}
        {task.comment_count > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <MessageSquare size={11} />
            {task.comment_count}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TasksPage() {
  const { id: projectId } = useParams()
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [view, setView] = useState('kanban') // kanban | list
  const [modal, setModal] = useState(null) // null | 'new' | task object

  const myRole = members.find(m => m.user?.id === user?.id)?.role
  const isAdmin = myRole === 'admin' || project?.owner_id === user?.id

  const load = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks/`),
      ])
      setProject(pRes.data.project)
      setMembers(pRes.data.members || [])
      setTasks(tRes.data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [projectId])

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const handleSave = (saved, isUpdate) => {
    if (isUpdate) setTasks(t => t.map(x => x.id === saved.id ? saved : x))
    else setTasks(t => [saved, ...t])
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`)
      setTasks(t => t.filter(x => x.id !== taskId))
      toast.success('Task deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus })
      setTasks(t => t.map(x => x.id === taskId ? res.data : x))
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return (
    <div className="p-6 animate-pulse space-y-4">
      <div className="h-6 bg-gray-100 rounded w-32" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Link to={`/projects/${projectId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={16} />
            {project?.name}
          </Link>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Search tasks..."
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
            </select>

            {/* View toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {['kanban', 'list'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    view === v ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Plus size={15} />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'kanban' ? (
          /* KANBAN VIEW */
          <div className="flex gap-4 h-full" style={{ minWidth: `${STATUSES.length * 280}px` }}>
            {STATUSES.map(status => {
              const colTasks = filtered.filter(t => t.status === status)
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status} className="flex flex-col w-72 shrink-0">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${cfg.color}`}>
                    <span className="text-sm font-semibold">{cfg.label}</span>
                    <span className="text-xs font-medium opacity-70 bg-white bg-opacity-50 px-1.5 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide">
                    {colTasks.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onEdit={setModal}
                        onDelete={handleDelete}
                        isAdmin={isAdmin}
                        userId={user?.id}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                        <p className="text-xs text-gray-400">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">No tasks found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="text-left px-6 py-3">Task</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Priority</th>
                    <th className="text-left px-4 py-3">Assignee</th>
                    <th className="text-left px-4 py-3">Due Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => {
                    const p = PRIORITY_CONFIG[t.priority]
                    const s = STATUS_CONFIG[t.status]
                    const overdue = isOverdue(t.due_date) && t.status !== 'done'
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setModal(t)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-800">{t.title}</p>
                          {t.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{t.description}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={t.status}
                            onClick={e => e.stopPropagation()}
                            onChange={e => handleStatusChange(t.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${s.color}`}
                          >
                            {STATUSES.map(st => <option key={st} value={st}>{STATUS_CONFIG[st].label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${p.color}`}>{p.label}</span>
                        </td>
                        <td className="px-4 py-4">
                          {t.assignee ? (
                            <div className="flex items-center gap-2">
                              <img src={t.assignee.avatar} className="w-6 h-6 rounded-full" alt="" />
                              <span className="text-xs text-gray-600 truncate max-w-24">{t.assignee.name}</span>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          {t.due_date ? (
                            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                              {overdue && '⚠ '}{formatDate(t.due_date)}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                          {(t.created_by === user?.id || isAdmin) && (
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {modal && (
        <TaskModal
          task={modal === 'new' ? null : modal}
          projectId={projectId}
          members={members}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}