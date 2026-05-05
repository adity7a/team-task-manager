import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'

export function formatDate(dateStr) {
  if (!dateStr) return null
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d, yyyy')
}

export function isOverdue(dateStr) {
  if (!dateStr) return false
  return isPast(parseISO(dateStr))
}

export const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50 border-red-200', dot: 'bg-red-500' },
  high:   { label: 'High',   color: 'text-orange-600 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
  low:    { label: 'Low',    color: 'text-green-600 bg-green-50 border-green-200', dot: 'bg-green-500' },
}

export const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: 'text-gray-600 bg-gray-100', border: 'border-gray-300' },
  in_progress: { label: 'In Progress', color: 'text-blue-600 bg-blue-50',  border: 'border-blue-300' },
  review:      { label: 'Review',      color: 'text-purple-600 bg-purple-50', border: 'border-purple-300' },
  done:        { label: 'Done',        color: 'text-green-600 bg-green-50',  border: 'border-green-300' },
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}