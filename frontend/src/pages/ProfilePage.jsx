import React from "react";
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { User, Mail, Shield, Save, Camera } from 'lucide-react'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name cannot be empty')
    setLoading(true)
    try {
      const res = await api.put('/auth/me', form)
      updateUser(res.data)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Avatar Banner */}
        <div className="h-28 bg-gradient-to-r from-primary-500 to-indigo-500" />
        <div className="px-6 pb-6">
          <div className="relative -mt-12 mb-4 inline-block">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="w-24 h-24 rounded-2xl border-4 border-white shadow-md object-cover bg-primary-100"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><User size={14} /> Full Name</span>
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Mail size={14} /> Email</span>
              </label>
              <input
                value={user?.email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Shield size={14} /> Account Role</span>
              </label>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                user?.role === 'admin'
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                <Shield size={14} />
                {user?.role}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {user?.role === 'admin'
                  ? 'You can create and manage projects'
                  : 'You can join projects and work on tasks'}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Save size={15} />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-4">
        <h2 className="font-semibold text-gray-900 mb-4">Account Info</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Member since</span>
            <span className="text-gray-800 font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">User ID</span>
            <span className="text-gray-400 font-mono text-xs">#{user?.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}