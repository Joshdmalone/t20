"use client"

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Event {
  id: string
  clientId: string
  eventName: string
  zipCode: string
  latitude: number
  longitude: number
  eventDate: string
  eventTime: string
  conflicts: string[]
  isActive: boolean
}

interface Client {
  id: string
  name: string
  color: string
  isActive: boolean
}

interface InteractiveMapProps {
  events: Event[]
  clients: Client[]
  onEventClick?: (event: Event) => void
}

export default function InteractiveMap({ events, clients, onEventClick }: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialize map centered on New York
    const map = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 11)
    mapRef.current = map

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer)
      }
    })

    // Add markers and circles for each event
    events.forEach((event) => {
      const client = clients.find((c) => c.id === event.clientId)
      if (!client) return

      const hasConflicts = event.conflicts.length > 0

      // Create 15-mile radius circle
      const circle = L.circle([event.latitude, event.longitude], {
        color: hasConflicts ? '#ef4444' : client.color,
        fillColor: hasConflicts ? '#ef4444' : client.color,
        fillOpacity: 0.1,
        radius: 24140, // 15 miles in meters
        weight: 2,
      }).addTo(map)

      // Create custom icon
      const iconHtml = `
        <div style="
          width: 32px;
          height: 32px;
          background-color: ${hasConflicts ? '#ef4444' : client.color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })

      // Create marker
      const marker = L.marker([event.latitude, event.longitude], {
        icon: customIcon,
      }).addTo(map)

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">${event.eventName}</h3>
          <p style="font-size: 13px; color: #666; margin: 4px 0;"><strong>Client:</strong> ${client.name}</p>
          <p style="font-size: 13px; color: #666; margin: 4px 0;"><strong>Zip Code:</strong> ${event.zipCode}</p>
          <p style="font-size: 13px; color: #666; margin: 4px 0;"><strong>Date:</strong> ${event.eventDate}</p>
          <p style="font-size: 13px; color: #666; margin: 4px 0;"><strong>Time:</strong> ${event.eventTime}</p>
          ${hasConflicts ? `
            <div style="margin-top: 8px; padding: 8px; background-color: #fee; border-radius: 4px;">
              <p style="font-size: 12px; color: #c00; font-weight: 600;">⚠️ ${event.conflicts.length} Conflict(s)</p>
            </div>
          ` : `
            <div style="margin-top: 8px; padding: 8px; background-color: #efe; border-radius: 4px;">
              <p style="font-size: 12px; color: #060; font-weight: 600;">✓ No Conflicts</p>
            </div>
          `}
        </div>
      `

      marker.bindPopup(popupContent)

      // Add click handler
      if (onEventClick) {
        marker.on('click', () => onEventClick(event))
      }
    })

    // Fit bounds to show all markers
    if (events.length > 0) {
      const bounds = L.latLngBounds(events.map((e) => [e.latitude, e.longitude]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [events, clients, onEventClick])

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height: '600px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  )
}
