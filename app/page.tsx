"use client"

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Calendar, MapPin, Users, AlertTriangle, Plus, X, Edit, Trash2, Search, CheckCircle, Upload, Download, Eye, EyeOff } from 'lucide-react'

interface Event {
  id: string
  clientId: string
  eventName: string
  zipCode: string
  latitude: number
  longitude: number
  eventDate: string
  eventTime: string
  notes: string
  isActive: boolean
  conflicts: string[]
}

interface Client {
  id: string
  name: string
  contactEmail: string
  contactPhone: string
  assignedZipCodes: string[]
  color: string
  isActive: boolean
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const geocodeZipCode = (zipCode: string): { lat: number; lng: number } => {
  const hash = zipCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return {
    lat: 40.7128 + (hash % 100) / 100,
    lng: -74.0060 + (hash % 100) / 100
  }
}

const initialClients: Client[] = [
  { id: '1', name: 'Acme Events', contactEmail: 'contact@acme.com', contactPhone: '555-0101', assignedZipCodes: ['10001', '10002', '10003'], color: '#3b82f6', isActive: true },
  { id: '2', name: 'Premier Productions', contactEmail: 'info@premier.com', contactPhone: '555-0102', assignedZipCodes: ['10004', '10005'], color: '#10b981', isActive: true },
  { id: '3', name: 'Elite Entertainment', contactEmail: 'hello@elite.com', contactPhone: '555-0103', assignedZipCodes: ['10006', '10007'], color: '#f59e0b', isActive: true },
]

const initialEvents: Event[] = [
  {
    id: '1',
    clientId: '1',
    eventName: 'Corporate Gala 2024',
    zipCode: '10001',
    latitude: 40.7489,
    longitude: -73.9680,
    eventDate: '2024-02-15',
    eventTime: '18:00',
    notes: 'Annual corporate event',
    isActive: true,
    conflicts: []
  },
  {
    id: '2',
    clientId: '2',
    eventName: 'Product Launch',
    zipCode: '10004',
    latitude: 40.7589,
    longitude: -73.9780,
    eventDate: '2024-02-15',
    eventTime: '19:00',
    notes: 'New product unveiling',
    isActive: true,
    conflicts: []
  }
]

export default function TerritoryManagementApp() {
  const [activeTab, setActiveTab] = useState<'map' | 'events' | 'clients'>('map')
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClient, setFilterClient] = useState<string>('all')
  const [filterConflicts, setFilterConflicts] = useState<string>('all')
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  const [eventForm, setEventForm] = useState({
    clientId: '',
    eventName: '',
    zipCode: '',
    eventDate: '',
    eventTime: '',
    notes: '',
    isActive: true
  })

  const [clientForm, setClientForm] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    assignedZipCodes: '',
    isActive: true
  })

  useEffect(() => {
    const savedClients = localStorage.getItem('territoryClients')
    const savedEvents = localStorage.getItem('territoryEvents')
    
    if (savedClients) setClients(JSON.parse(savedClients))
    if (savedEvents) setEvents(JSON.parse(savedEvents))
  }, [])

  useEffect(() => {
    localStorage.setItem('territoryClients', JSON.stringify(clients))
  }, [clients])

  useEffect(() => {
    localStorage.setItem('territoryEvents', JSON.stringify(events))
  }, [events])

  useEffect(() => {
    const updatedEvents = events.map(event => {
      const conflicts: string[] = []
      
      events.forEach(otherEvent => {
        if (event.id !== otherEvent.id && event.eventDate === otherEvent.eventDate && event.isActive && otherEvent.isActive) {
          const distance = haversineDistance(
            event.latitude,
            event.longitude,
            otherEvent.latitude,
            otherEvent.longitude
          )
          
          if (distance <= 15) {
            conflicts.push(otherEvent.id)
          }
        }
      })
      
      return { ...event, conflicts }
    })
    
    if (JSON.stringify(updatedEvents) !== JSON.stringify(events)) {
      setEvents(updatedEvents)
    }
  }, [events])

  const checkConflicts = (newEvent: Partial<Event>): string[] => {
    if (!newEvent.latitude || !newEvent.longitude || !newEvent.eventDate) return []
    
    const conflicts: string[] = []
    
    events.forEach(event => {
      if (event.eventDate === newEvent.eventDate && event.isActive) {
        const distance = haversineDistance(
          newEvent.latitude!,
          newEvent.longitude!,
          event.latitude,
          event.longitude
        )
        
        if (distance <= 15) {
          conflicts.push(event.id)
        }
      }
    })
    
    return conflicts
  }

  const checkZipCodeRights = (clientId: string, zipCode: string): boolean => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return false
    
    const otherClientHasZip = clients.some(c => 
      c.id !== clientId && c.assignedZipCodes.includes(zipCode) && c.isActive
    )
    
    return !otherClientHasZip || client.assignedZipCodes.includes(zipCode)
  }

  const handleEventSubmit = () => {
    if (!eventForm.zipCode.match(/^\d{5}$/)) {
      alert('Please enter a valid 5-digit zip code.')
      return
    }

    if (!checkZipCodeRights(eventForm.clientId, eventForm.zipCode)) {
      alert(`This zip code (${eventForm.zipCode}) is assigned to another client. You cannot schedule events here.`)
      return
    }
    
    const coords = geocodeZipCode(eventForm.zipCode)
    
    const newEvent: Event = {
      id: selectedEvent?.id || generateId(),
      clientId: eventForm.clientId,
      eventName: eventForm.eventName,
      zipCode: eventForm.zipCode,
      latitude: coords.lat,
      longitude: coords.lng,
      eventDate: eventForm.eventDate,
      eventTime: eventForm.eventTime,
      notes: eventForm.notes,
      isActive: eventForm.isActive,
      conflicts: []
    }
    
    const conflicts = checkConflicts(newEvent)
    
    if (conflicts.length > 0 && !selectedEvent) {
      const conflictDetails = conflicts.map(id => {
        const event = events.find(e => e.id === id)
        return event ? `${event.eventName} (${event.eventDate})` : ''
      }).join(', ')
      
      const proceed = window.confirm(
        `Warning: This event conflicts with ${conflicts.length} existing event(s): ${conflictDetails}. Do you want to proceed anyway?`
      )
      
      if (!proceed) return
    }
    
    if (selectedEvent) {
      setEvents(events.map(e => e.id === selectedEvent.id ? newEvent : e))
    } else {
      setEvents([...events, newEvent])
    }
    
    resetEventForm()
  }

  const resetEventForm = () => {
    setEventForm({
      clientId: '',
      eventName: '',
      zipCode: '',
      eventDate: '',
      eventTime: '',
      notes: '',
      isActive: true
    })
    setSelectedEvent(null)
    setShowEventForm(false)
  }

  const handleClientSubmit = () => {
    const zipCodes = clientForm.assignedZipCodes
      .split(',')
      .map(z => z.trim())
      .filter(z => z.match(/^\d{5}$/))
    
    const newClient: Client = {
      id: selectedClient?.id || generateId(),
      name: clientForm.name,
      contactEmail: clientForm.contactEmail,
      contactPhone: clientForm.contactPhone,
      assignedZipCodes: zipCodes,
      color: selectedClient?.color || `#${Math.floor(Math.random()*16777215).toString(16)}`,
      isActive: clientForm.isActive
    }
    
    if (selectedClient) {
      setClients(clients.map(c => c.id === selectedClient.id ? newClient : c))
    } else {
      setClients([...clients, newClient])
    }
    
    resetClientForm()
  }

  const resetClientForm = () => {
    setClientForm({
      name: '',
      contactEmail: '',
      contactPhone: '',
      assignedZipCodes: '',
      isActive: true
    })
    setSelectedClient(null)
    setShowClientForm(false)
  }

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event)
    setEventForm({
      clientId: event.clientId,
      eventName: event.eventName,
      zipCode: event.zipCode,
      eventDate: event.eventDate,
      eventTime: event.eventTime,
      notes: event.notes,
      isActive: event.isActive
    })
    setShowEventForm(true)
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setClientForm({
      name: client.name,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      assignedZipCodes: client.assignedZipCodes.join(', '),
      isActive: client.isActive
    })
    setShowClientForm(true)
  }

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(e => e.id !== id))
    }
  }

  const handleDeleteClient = (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(c => c.id !== id))
      setEvents(events.filter(e => e.clientId !== id))
    }
  }

  const toggleEventActive = (id: string) => {
    setEvents(events.map(e => e.id === id ? { ...e, isActive: !e.isActive } : e))
  }

  const toggleClientActive = (id: string) => {
    setClients(clients.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const rows = text.split('\n').map(row => row.split(','))
        
        const newClients: Client[] = []
        rows.slice(1).forEach(row => {
          if (row.length >= 4) {
            const zipCodes = row[3].split(';').map(z => z.trim()).filter(z => z.match(/^\d{5}$/))
            newClients.push({
              id: generateId(),
              name: row[0].trim(),
              contactEmail: row[1].trim(),
              contactPhone: row[2].trim(),
              assignedZipCodes: zipCodes,
              color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
              isActive: true
            })
          }
        })
        
        setClients([...clients, ...newClients])
        setShowImportModal(false)
        alert(`Successfully imported ${newClients.length} clients!`)
      } catch (error) {
        alert('Error parsing CSV file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  const exportData = () => {
    const csvContent = [
      ['Client Name', 'Email', 'Phone', 'Zip Codes', 'Status'],
      ...clients.map(c => [
        c.name,
        c.contactEmail,
        c.contactPhone,
        c.assignedZipCodes.join(';'),
        c.isActive ? 'Active' : 'Inactive'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'territory-clients.csv'
    a.click()
  }

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          event.zipCode.includes(searchTerm)
      const matchesClient = filterClient === 'all' || event.clientId === filterClient
      const matchesConflicts = filterConflicts === 'all' || 
                              (filterConflicts === 'conflicts' && event.conflicts.length > 0) ||
                              (filterConflicts === 'no-conflicts' && event.conflicts.length === 0)
      const matchesActive = !showActiveOnly || event.isActive
      
      return matchesSearch && matchesClient && matchesConflicts && matchesActive
    })
  }, [events, searchTerm, filterClient, filterConflicts, showActiveOnly])

  const displayedEvents = showActiveOnly ? events.filter(e => e.isActive) : events

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Territory Manager</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button onClick={() => setShowImportModal(true)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button onClick={exportData} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={() => setShowEventForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Event</span>
              </button>
              <button onClick={() => setShowClientForm(true)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">New Client</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between border-t border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('map')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'map'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Map View
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'events'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'clients'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Clients
              </button>
            </div>
            
            <div className="flex items-center space-x-2 py-2">
              <button
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-2"
              >
                {showActiveOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-xs">{showActiveOnly ? 'Active Only' : 'Show All'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Territory Map</h2>
                  <p className="text-gray-600 text-sm mt-1">Visual representation of all scheduled events</p>
                </div>
              </div>
              
              <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96 md:h-[600px]">
                <div className="absolute inset-0">
                  <div className="relative w-full h-full">
                    {displayedEvents.map(event => {
                      const client = clients.find(c => c.id === event.clientId)
                      const hasConflicts = event.conflicts.length > 0
                      
                      return (
                        <div
                          key={event.id}
                          className="absolute cursor-pointer group"
                          style={{
                            left: `${((event.longitude + 74.0060) / 0.5) * 100}%`,
                            top: `${((40.8 - event.latitude) / 0.2) * 100}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div
                            className={`absolute rounded-full border-2 opacity-20 ${
                              hasConflicts ? 'bg-red-500 border-red-600' : 'bg-blue-500 border-blue-600'
                            }`}
                            style={{
                              width: '120px',
                              height: '120px',
                              left: '50%',
                              top: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                          />
                          
                          <div
                            className={`w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center ${
                              hasConflicts ? 'bg-red-500 border-red-700' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: hasConflicts ? undefined : client?.color }}
                          >
                            <MapPin className="w-4 h-4 text-white" />
                          </div>
                          
                          <div className="absolute left-full ml-2 top-0 bg-white rounded-lg shadow-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 hidden md:block">
                            <p className="font-semibold text-sm">{event.eventName}</p>
                            <p className="text-xs text-gray-600">{client?.name}</p>
                            <p className="text-xs text-gray-500">Zip: {event.zipCode}</p>
                            <p className="text-xs text-gray-500">{event.eventDate}</p>
                            {hasConflicts && (
                              <p className="text-xs text-red-600 flex items-center mt-1">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {event.conflicts.length} conflict(s)
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-2 max-w-xs">
                  <p className="font-semibold text-sm mb-2">Legend</p>
                  {clients.filter(c => showActiveOnly ? c.isActive : true).slice(0, 5).map(client => (
                    <div key={client.id} className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" style={{ backgroundColor: client.color }} />
                      <span className="text-xs truncate">{client.name}</span>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-700 flex-shrink-0" />
                    <span className="text-xs">Has Conflicts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Events</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Client</label>
                  <select 
                    value={filterClient} 
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Clients</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                  <select 
                    value={filterConflicts} 
                    onChange={(e) => setFilterConflicts(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Events</option>
                    <option value="conflicts">With Conflicts</option>
                    <option value="no-conflicts">No Conflicts</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredEvents.length === 0 ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No events found</p>
                </div>
              ) : (
                filteredEvents.map(event => {
                  const client = clients.find(c => c.id === event.clientId)
                  const hasConflicts = event.conflicts.length > 0
                  
                  return (
                    <div key={event.id} className={`bg-white rounded-lg shadow border p-4 md:p-6 ${hasConflicts ? 'border-red-300' : 'border-gray-200'} ${!event.isActive ? 'opacity-60' : ''}`}>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: client?.color }} />
                            <h3 className="text-lg font-semibold truncate">{event.eventName}</h3>
                            {!event.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Inactive
                              </span>
                            )}
                            {hasConflicts && event.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {event.conflicts.length} Conflict(s)
                              </span>
                            )}
                            {!hasConflicts && event.isActive && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Clear
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><strong>Client:</strong> {client?.name}</p>
                            <p><strong>Zip Code:</strong> {event.zipCode}</p>
                            <p><strong>Date & Time:</strong> {event.eventDate} at {event.eventTime}</p>
                            {event.notes && <p><strong>Notes:</strong> {event.notes}</p>}
                          </div>
                          
                          {hasConflicts && event.isActive && (
                            <div className="mt-3 p-3 bg-red-50 rounded-lg">
                              <p className="text-sm font-medium text-red-800 mb-2">Conflicting Events:</p>
                              <ul className="space-y-1">
                                {event.conflicts.map(conflictId => {
                                  const conflictEvent = events.find(e => e.id === conflictId)
                                  if (!conflictEvent) return null
                                  const distance = haversineDistance(
                                    event.latitude,
                                    event.longitude,
                                    conflictEvent.latitude,
                                    conflictEvent.longitude
                                  ).toFixed(1)
                                  return (
                                    <li key={conflictId} className="text-sm text-red-700">
                                      {conflictEvent.eventName} ({distance} miles away)
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex md:flex-col gap-2">
                          <button
                            onClick={() => toggleEventActive(event.id)}
                            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                          >
                            {event.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEditEvent(event)}
                            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.filter(c => showActiveOnly ? c.isActive : true).map(client => {
              const clientEvents = events.filter(e => e.clientId === client.id)
              const activeEvents = clientEvents.filter(e => e.isActive)
              
              return (
                <div key={client.id} className={`bg-white rounded-lg shadow border border-gray-200 p-6 ${!client.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold truncate">{client.name}</h3>
                        {!client.isActive && <span className="text-xs text-gray-500">(Inactive)</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleClientActive(client.id)}
                        className="p-1 text-gray-700 hover:bg-gray-100 rounded"
                      >
                        {client.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEditClient(client)}
                        className="p-1 text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-1 text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <p className="truncate"><strong>Email:</strong> {client.contactEmail}</p>
                      <p><strong>Phone:</strong> {client.contactPhone}</p>
                      <p><strong>Total Events:</strong> {clientEvents.length}</p>
                      <p><strong>Active Events:</strong> {activeEvents.length}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Assigned Zip Codes ({client.assignedZipCodes.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {client.assignedZipCodes.length > 0 ? (
                          client.assignedZipCodes.map(zip => (
                            <span key={zip} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {zip}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No zip codes assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedEvent ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={resetEventForm} className="p-1 text-gray-700 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={eventForm.clientId}
                  onChange={(e) => setEventForm({ ...eventForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client</option>
                  {clients.filter(c => c.isActive).map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={eventForm.eventName}
                  onChange={(e) => setEventForm({ ...eventForm, eventName: e.target.value })}
                  placeholder="Corporate Gala 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code *</label>
                <input
                  type="text"
                  value={eventForm.zipCode}
                  onChange={(e) => setEventForm({ ...eventForm, zipCode: e.target.value })}
                  placeholder="10001"
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">5-digit zip code</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                <input
                  type="date"
                  value={eventForm.eventDate}
                  onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Time *</label>
                <input
                  type="time"
                  value={eventForm.eventTime}
                  onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  placeholder="Additional details..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={eventForm.isActive}
                  onChange={(e) => setEventForm({ ...eventForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">Active Event</label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleEventSubmit}
                  disabled={!eventForm.clientId || !eventForm.eventName || !eventForm.zipCode || !eventForm.eventDate || !eventForm.eventTime}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedEvent ? 'Update' : 'Create'}
                </button>
                <button 
                  onClick={resetEventForm}
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedClient ? 'Edit Client' : 'New Client'}</h2>
              <button onClick={resetClientForm} className="p-1 text-gray-700 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="Acme Events"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input
                  type="email"
                  value={clientForm.contactEmail}
                  onChange={(e) => setClientForm({ ...clientForm, contactEmail: e.target.value })}
                  placeholder="contact@acme.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  value={clientForm.contactPhone}
                  onChange={(e) => setClientForm({ ...clientForm, contactPhone: e.target.value })}
                  placeholder="555-0101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Zip Codes</label>
                <textarea
                  value={clientForm.assignedZipCodes}
                  onChange={(e) => setClientForm({ ...clientForm, assignedZipCodes: e.target.value })}
                  placeholder="10001, 10002, 10003"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated zip codes</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={clientForm.isActive}
                  onChange={(e) => setClientForm({ ...clientForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">Active Client</label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClientSubmit}
                  disabled={!clientForm.name || !clientForm.contactEmail || !clientForm.contactPhone}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedClient ? 'Update' : 'Create'}
                </button>
                <button 
                  onClick={resetClientForm}
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Import Clients</h2>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-gray-700 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Upload a CSV file with this format:</p>
              <div className="bg-gray-50 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                Client Name,Email,Phone,Zip Codes<br/>
                Acme Events,contact@acme.com,555-0101,10001;10002;10003
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">Choose a file</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">CSV files only</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
