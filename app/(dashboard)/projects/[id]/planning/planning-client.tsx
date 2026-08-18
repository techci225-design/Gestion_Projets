'use client'

import React, { useState, useMemo, useRef, useEffect, useTransition } from 'react'
import { Folder, CheckSquare, Flag, ChevronRight, ChevronDown, Search, Filter } from 'lucide-react'
import { format, parse, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInDays, addMonths, startOfDay, isWithinInterval, addDays, min, max } from 'date-fns'
import { fr } from 'date-fns/locale'

const parseDateString = (dateStr: string) => parse(dateStr, 'yyyy-MM-dd', startOfDay(new Date()))
import { updateTaskDates } from '@/lib/actions/planning.actions'
import { getTeamMemberDisplayName } from '@/lib/utils/user'

interface PlanningClientProps {
  projectId: string
  project: any
  initialTasks: any[]
  teamMembers: any[]
  userRole: string
}

export function PlanningClient({ projectId, project, initialTasks, teamMembers, userRole }: PlanningClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(initialTasks.map(t => t.id)))
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterResponsible, setFilterResponsible] = useState<string>('ALL')
  const [isPending, startTransition] = useTransition()
  
  // Ref for the scrolling container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Expand / Collapse
  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodes)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedNodes(next)
  }

  const isVisible = (task: any) => {
    let current = task.parent_id
    while (current) {
      if (!expandedNodes.has(current)) return false
      const parent = tasks.find((t) => t.id === current)
      current = parent?.parent_id
    }
    
    if (filterStatus !== 'ALL' && task.status !== filterStatus) return false
    if (filterResponsible !== 'ALL') {
      if (filterResponsible === 'UNASSIGNED' && task.responsible_user_id !== null) return false
      if (filterResponsible !== 'UNASSIGNED' && task.responsible_user_id !== filterResponsible) return false
    }
    
    return true
  }

  // Timeline boundaries calculation
  const timelineInterval = useMemo(() => {
    let earliest = startOfMonth(addDays(new Date(), -7))
    let latest = endOfMonth(addDays(new Date(), 7))

    const validDates = tasks.filter(t => isVisible(t) && t.date_start && t.date_end)
    if (validDates.length > 0) {
      const allStarts = validDates.map(t => parseDateString(t.date_start))
      const allEnds = validDates.map(t => parseDateString(t.date_end))
      const minDate = min([...allStarts, new Date()])
      const maxDate = max([...allEnds, new Date()])
      
      // Pad by 7 days before and after
      earliest = startOfMonth(addDays(minDate, -7))
      latest = endOfMonth(addDays(maxDate, 7))
    }

    return { start: earliest, end: latest }
  }, [tasks, filterStatus, filterResponsible, expandedNodes])

  const totalDays = differenceInDays(timelineInterval.end, timelineInterval.start) + 1
  
  const DAY_WIDTH = useMemo(() => {
    if (totalDays > 365 * 3) return 5
    if (totalDays > 365) return 10
    if (totalDays > 180) return 20
    if (totalDays > 90) return 30
    return 40
  }, [totalDays])

  const months = useMemo(() => {
    return eachMonthOfInterval({ start: timelineInterval.start, end: timelineInterval.end })
  }, [timelineInterval])

  const today = startOfDay(new Date())
  const todayOffset = differenceInDays(today, timelineInterval.start) * DAY_WIDTH
  const isTodayInTimeline = isWithinInterval(today, { start: timelineInterval.start, end: timelineInterval.end })

  const scrollToDate = (date: Date) => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth
      const offset = differenceInDays(startOfDay(date), timelineInterval.start) * DAY_WIDTH
      const scrollTarget = Math.max(0, offset - (containerWidth - 450) / 2)
      scrollContainerRef.current.scrollTo({ left: scrollTarget, behavior: 'smooth' })
    }
  }


  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aParts = (a.code || '').split('.').map(Number)
      const bParts = (b.code || '').split('.').map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if (aParts[i] === undefined) return -1
        if (bParts[i] === undefined) return 1
        if (aParts[i] !== bParts[i]) return (aParts[i] || 0) - (bParts[i] || 0)
      }
      return 0
    })
  }, [tasks])


  // Drag & Drop for Task Dates
  const [draggingTask, setDraggingTask] = useState<{ id: string, initialStart: Date, initialEnd: Date, currentOffsetDays: number, startMouseX: number } | null>(null)

  const handleMouseDownOnBar = (e: React.MouseEvent, task: any) => {
    // Only allow moving TASK (not SUMMARY/MILESTONE for this first version)
    // Only if dates exist
    if (task.task_type !== 'TASK' || !task.date_start || !task.date_end) return
    e.stopPropagation()
    
    setDraggingTask({
      id: task.id,
      initialStart: parseDateString(task.date_start),
      initialEnd: parseDateString(task.date_end),
      currentOffsetDays: 0,
      startMouseX: e.clientX
    })
  }

  useEffect(() => {
    if (!draggingTask) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - draggingTask.startMouseX
      const offsetDays = Math.round(dx / DAY_WIDTH)
      
      setDraggingTask(prev => prev ? { ...prev, currentOffsetDays: offsetDays } : null)
    }

    const handleMouseUp = async (e: MouseEvent) => {
      if (draggingTask.currentOffsetDays !== 0) {
        // Apply change
        const newStart = addDays(draggingTask.initialStart, draggingTask.currentOffsetDays)
        const newEnd = addDays(draggingTask.initialEnd, draggingTask.currentOffsetDays)
        
        // Optimistic UI update
        setTasks(prev => prev.map(t => {
          if (t.id === draggingTask.id) {
            return { ...t, date_start: format(newStart, 'yyyy-MM-dd'), date_end: format(newEnd, 'yyyy-MM-dd') }
          }
          return t
        }))

        // Server update
        startTransition(async () => {
          const res = await updateTaskDates(projectId, draggingTask.id, format(newStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'))
          if (res?.error) {
            alert(res.error)
            // Revert (handled partially by revalidate, but we can do it explicitly if needed)
            setTasks(initialTasks)
          }
        })
      }
      setDraggingTask(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingTask, projectId, initialTasks])


  const getIcon = (type: string) => {
    if (type === 'SUMMARY') return <Folder className="w-4 h-4 text-primary shrink-0" />
    if (type === 'MILESTONE') return <Flag className="w-4 h-4 text-warning shrink-0" />
    return <CheckSquare className="w-4 h-4 text-success shrink-0" />
  }

  // Scroll to today on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      scrollToDate(new Date())
    }, 100)
    return () => clearTimeout(timeout)
  }, [timelineInterval.start, DAY_WIDTH])

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-primary mb-1">Planning du projet</h2>
          <p className="text-base text-text-secondary">Planifiez, visualisez et suivez l'avancement de vos activités.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-2 shadow-sm h-10">
            <Filter className="w-4 h-4 text-text-secondary" />
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent text-sm text-text-primary focus:outline-none py-1 border-r border-border pr-2"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PLANNED">Planifié</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="COMPLETED">Terminé</option>
              <option value="BLOCKED">Bloqué</option>
            </select>
            <select 
              value={filterResponsible} 
              onChange={e => setFilterResponsible(e.target.value)}
              className="bg-transparent text-sm text-text-primary focus:outline-none py-1 pl-2"
            >
              <option value="ALL">Tous les responsables</option>
              <option value="UNASSIGNED">Non assigné</option>
              {teamMembers.map(m => (
                <option key={m.user_id} value={m.user_id}>{getTeamMemberDisplayName(m, teamMembers)}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={() => scrollToDate(new Date())}
            className="flex items-center gap-2 bg-white border border-border hover:bg-slate-50 text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm h-10"
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Gantt Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 bg-white border border-border rounded-lg shadow-sm overflow-auto relative select-none"
      >
        <div className="min-w-max relative">
          
          {/* --- Timeline Header --- */}
          <div className="flex sticky top-0 z-40 bg-surface border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            
            {/* Left Header (Fixed Column) */}
            <div className="w-[450px] shrink-0 sticky left-0 z-50 bg-surface-dim border-r border-border flex items-center justify-between p-3 font-semibold text-text-primary text-sm shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
              <span>Activité</span>
              <div className="flex gap-4 text-xs font-medium text-text-secondary">
                <span className="w-16 text-center">Début</span>
                <span className="w-16 text-center">Fin</span>
                <span className="w-12 text-center">%</span>
              </div>
            </div>
            
            {/* Right Header (Months/Days) */}
            <div className="flex">
              {months.map((month, i) => {
                const daysInMonth = differenceInDays(endOfMonth(month), month) + 1
                return (
                  <div key={i} className="flex flex-col border-r border-border" style={{ width: daysInMonth * DAY_WIDTH }}>
                    <div className="py-1 text-center font-medium text-sm text-text-primary border-b border-border/50 bg-slate-50/50">
                      {format(month, 'MMMM yyyy', { locale: fr })}
                    </div>
                    {/* Optional: we could render day numbers here if needed, but it clutters. We'll leave it as a solid bar, or small ticks. */}
                    <div className="flex h-5">
                       {/* Render ticks for weeks maybe? Let's just keep it clean */}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* --- Today Line --- */}
          {isTodayInTimeline && (
            <div 
              className="absolute top-0 bottom-0 w-px bg-danger/50 z-20 pointer-events-none" 
              style={{ left: 450 + todayOffset }}
            >
              <div className="absolute top-2 -translate-x-1/2 bg-danger text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                Auj.
              </div>
            </div>
          )}

          {/* --- Task Rows --- */}
          {sortedTasks.length === 0 ? (
            <div className="p-12 text-center text-text-secondary sticky left-0 w-full flex flex-col items-center">
              <Folder className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-lg font-medium text-slate-500">Votre planning est encore vide</p>
              <p className="text-sm">Créez des activités dans la vue "WBS / Tâches" pour construire votre planning.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {sortedTasks.map(task => {
                if (!isVisible(task)) return null
                
                const depth = (task.code || '').split('.').length - 1
                const hasChildren = sortedTasks.some(t => t.parent_id === task.id)
                const isExpanded = expandedNodes.has(task.id)
                
                // Calculate position for Gantt bar
                let leftOffset = 0
                let barWidth = 0
                let hasDates = !!(task.date_start && task.date_end)
                
                let renderStart = parseDateString(task.date_start)
                let renderEnd = parseDateString(task.date_end)

                // If currently dragging this task, adjust dates for render
                if (draggingTask?.id === task.id) {
                  renderStart = addDays(draggingTask!.initialStart, draggingTask!.currentOffsetDays)
                  renderEnd = addDays(draggingTask!.initialEnd, draggingTask!.currentOffsetDays)
                }
                
                if (hasDates) {
                  leftOffset = differenceInDays(renderStart, timelineInterval.start) * DAY_WIDTH
                  barWidth = (differenceInDays(renderEnd, renderStart) + 1) * DAY_WIDTH
                  // Clamp width if negative (invalid dates)
                  if (barWidth < 0) barWidth = 0
                }

                // Status styling mapping
                let statusColor = 'bg-slate-300'
                if (task.status === 'COMPLETED') statusColor = 'bg-success'
                if (task.status === 'IN_PROGRESS') statusColor = 'bg-primary'
                if (task.status === 'PLANNED') statusColor = 'bg-slate-400'
                if (task.status === 'BLOCKED') statusColor = 'bg-danger'
                
                return (
                  <div key={task.id} className="flex border-b border-border/40 hover:bg-slate-50/80 group h-10 transition-colors">
                    
                    {/* Left Pane Cell */}
                    <div className="w-[450px] shrink-0 sticky left-0 z-30 bg-white group-hover:bg-slate-50 border-r border-border flex items-center justify-between p-2 shadow-[1px_0_5px_rgba(0,0,0,0.02)] transition-colors">
                      <div className="flex items-center gap-1.5 overflow-hidden" style={{ paddingLeft: `${depth * 1}rem` }}>
                        <button 
                          onClick={() => hasChildren && toggleExpand(task.id)}
                          className={`w-4 h-4 flex items-center justify-center rounded hover:bg-slate-200 shrink-0 ${hasChildren ? 'cursor-pointer text-text-secondary' : 'opacity-0 pointer-events-none'}`}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        {getIcon(task.task_type)}
                        <span className={`text-sm truncate pr-2 ${task.task_type === 'SUMMARY' ? 'font-semibold text-primary' : 'font-medium text-text-primary'}`} title={task.name}>
                          {task.code} {task.name}
                        </span>
                      </div>
                      
                      <div className="flex gap-4 text-xs text-text-secondary shrink-0 font-mono items-center">
                        <span className="w-16 text-center">{task.date_start ? format(parseDateString(task.date_start), 'dd/MM/yy') : '-'}</span>
                        <span className="w-16 text-center">{task.date_end ? format(parseDateString(task.date_end), 'dd/MM/yy') : '-'}</span>
                        <span className={`w-12 text-center font-medium ${task.percent_complete === 100 ? 'text-success' : ''}`}>{task.percent_complete}%</span>
                      </div>
                    </div>
                    
                    {/* Right Pane Cell (Timeline) */}
                    <div className="flex relative" style={{ width: totalDays * DAY_WIDTH }}>
                      {/* Grid background could go here if we wanted vertical lines per month/week */}
                      
                      {hasDates ? (
                        <div className="absolute h-full flex items-center" style={{ left: leftOffset, width: barWidth }}>
                          
                          {/* TASK Render */}
                          {task.task_type === 'TASK' && (
                            <div 
                              onMouseDown={(e) => handleMouseDownOnBar(e, task)}
                              className={`relative h-6 w-full rounded shadow-sm overflow-hidden cursor-ew-resize opacity-90 hover:opacity-100 transition-opacity bg-slate-200 border border-slate-300 ${draggingTask?.id === task.id ? 'ring-2 ring-primary ring-offset-1 z-20' : 'z-10'}`}
                              title={`${task.name}\nDu ${format(renderStart, 'dd/MM/yyyy')} au ${format(renderEnd, 'dd/MM/yyyy')}\nAvancement: ${task.percent_complete}%`}
                            >
                              {/* Progress Fill */}
                              <div 
                                onMouseDown={(e) => e.stopPropagation()}
                                className={`absolute top-0 bottom-0 left-0 ${statusColor}`}
                                style={{ width: `${task.percent_complete}%` }}
                              />
                            </div>
                          )}

                          {/* SUMMARY Render */}
                          {task.task_type === 'SUMMARY' && (
                            <div 
                              className="relative h-4 w-full mt-1 z-10"
                              title={`${task.name}\nDu ${format(renderStart, 'dd/MM/yyyy')} au ${format(renderEnd, 'dd/MM/yyyy')}\nAvancement global: ${task.percent_complete}%`}
                            >
                              {/* Top Bar */}
                              <div className="absolute top-0 left-0 right-0 h-2 bg-slate-800 rounded-t-sm" />
                              {/* Left Drop */}
                              <div className="absolute top-0 left-0 w-2 h-4 bg-slate-800 rounded-bl-sm" />
                              {/* Right Drop */}
                              <div className="absolute top-0 right-0 w-2 h-4 bg-slate-800 rounded-br-sm" />
                            </div>
                          )}

                          {/* MILESTONE Render */}
                          {task.task_type === 'MILESTONE' && (
                            <div 
                              className="relative h-6 w-6 -ml-3 z-10 flex items-center justify-center"
                              title={`${task.name}\nJalon le ${format(renderStart, 'dd/MM/yyyy')}`}
                            >
                              <div className="w-4 h-4 bg-warning rotate-45 border-2 border-white shadow-sm" />
                            </div>
                          )}

                        </div>
                      ) : (
                        <div className="flex items-center h-full px-4 text-xs italic text-slate-400">
                          Dates non définies
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          
        </div>
      </div>
      
      {/* Background Grid CSS pattern for Gantt (optional visual enhancement) */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Remove scrollbars for cleaner look on some elements if needed */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
