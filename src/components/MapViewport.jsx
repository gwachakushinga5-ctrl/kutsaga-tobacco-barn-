import { useEffect, useRef } from 'react'
import {
  Circle,
  MapContainer,
  Marker,
  Pane,
  Polygon,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import {
  BASEMAPS,
  MAP_CENTER,
  MAP_COLORS,
  MAP_ZOOM,
  STATUS_META,
  formatDateTime,
} from '../lib/constants'
import { boundsToLatLngs, formatArea } from '../lib/geo'

const createDetectionIcon = (detection, selected) => {
  const status = STATUS_META[detection.status]
  const classes = [
    'det-marker',
    `det-marker--${detection.status}`,
    detection.status === 'rejected' ? 'det-marker--rejected' : '',
    detection.small ? 'is-small' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return L.divIcon({
    className: 'det-marker-wrap',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div class="${classes}" style="--marker-color:${status.color}"><span class="det-marker__core"></span></div>`,
  })
}

const trbIcon = L.divIcon({
  className: 'det-marker-wrap',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<div class="trb-marker"></div>',
})

const MapBridge = ({ mapRef, onBoundsChange }) => {
  const map = useMap()
  const onBoundsChangeRef = useRef(onBoundsChange)

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
  }, [onBoundsChange])

  useEffect(() => {
    mapRef.current = map
    const container = map.getContainer()
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container.parentElement || container)
    const timer = setTimeout(() => map.invalidateSize(), 60)

    const emitBounds = () => {
      const bounds = map.getBounds()
      onBoundsChangeRef.current?.({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      })
    }
    map.on('moveend', emitBounds)
    emitBounds()

    return () => {
      clearTimeout(timer)
      map.off('moveend', emitBounds)
      observer.disconnect()
      mapRef.current = null
    }
  }, [map, mapRef])

  return null
}

const AoiDrawer = ({ drawing, onCreated, onCancel }) => {  const map = useMap()
  const onCreatedRef = useRef(onCreated)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCreatedRef.current = onCreated
    onCancelRef.current = onCancel
  }, [onCancel, onCreated])

  useEffect(() => {
    if (!drawing) return undefined

    const container = map.getContainer()
    const points = []
    const vertexLayers = []
    let completed = false
    let guide = null
    const polygon = L.polygon([], {
      color: '#14b8a6',
      weight: 2,
      dashArray: '6 5',
      fillColor: '#14b8a6',
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(map)

    const doubleClickZoomEnabled = map.doubleClickZoom.enabled()
    map.doubleClickZoom.disable()
    container.classList.add('drawing-aoi')

    const updateShape = () => {
      polygon.setLatLngs(points)
    }

    const cleanupLayers = () => {
      if (guide) {
        map.removeLayer(guide)
        guide = null
      }
      vertexLayers.forEach((layer) => map.removeLayer(layer))
      polygon.remove()
    }

    const finish = () => {
      if (completed) return
      const cleaned = points.filter((point, index) => {
        if (index === 0) return true
        const previous = points[index - 1]
        return (
          Math.abs(point.lat - previous.lat) > 1e-7 ||
          Math.abs(point.lng - previous.lng) > 1e-7
        )
      })
      if (cleaned.length < 3) return
      completed = true
      cleanupLayers()
      onCreatedRef.current(cleaned.map((point) => ({ lat: point.lat, lng: point.lng })))
    }

    const cancel = () => {
      if (completed) return
      completed = true
      cleanupLayers()
      onCancelRef.current()
    }

    const onClick = (event) => {
      if (completed) return
      points.push(event.latlng)
      const vertex = L.circleMarker(event.latlng, {
        radius: 4,
        color: '#5eead4',
        weight: 2,
        fillColor: '#020617',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map)
      vertexLayers.push(vertex)
      updateShape()
    }

    const onDoubleClick = (event) => {
      if (event.originalEvent) L.DomEvent.stop(event.originalEvent)
      finish()
    }

    const onMouseMove = (event) => {
      if (completed || !points.length) return
      if (!guide) {
        guide = L.polyline([...points, event.latlng], {
          color: '#14b8a6',
          weight: 1.3,
          opacity: 0.55,
          dashArray: '4 6',
          interactive: false,
        }).addTo(map)
      } else {
        guide.setLatLngs([...points, event.latlng])
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Enter') finish()
      if (event.key === 'Escape') cancel()
    }

    map.on('click', onClick)
    map.on('dblclick', onDoubleClick)
    map.on('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      if (!completed) {
        cleanupLayers()
      }
      map.off('click', onClick)
      map.off('dblclick', onDoubleClick)
      map.off('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      container.classList.remove('drawing-aoi')
      if (doubleClickZoomEnabled) map.doubleClickZoom.enable()
    }
  }, [drawing, map])

  return null
}

const InspectionClicker = ({ enabled, onInspect }) => {
  const map = useMap()
  const onInspectRef = useRef(onInspect)

  useEffect(() => {
    onInspectRef.current = onInspect
  }, [onInspect])

  useEffect(() => {
    if (!enabled) return undefined

    const container = map.getContainer()
    container.classList.add('inspect-imagery')
    const onClick = (event) => {
      onInspectRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng })
    }

    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
      container.classList.remove('inspect-imagery')
    }
  }, [enabled, map])

  return null
}

export const MapViewport = ({
  mapRef,
  detections,
  trbRegistry,
  sectors,
  layers,
  basemap,
  aoi,
  selectedZone,
  selectedId,
  drawing,
  inspectMode,
  onAoiCreated,
  onAoiCancel,
  onDetectionSelect,
  onMapInspect,
  onBoundsChange,
}) => {
  const basemapConfig = BASEMAPS.find((item) => item.id === basemap) ?? BASEMAPS[0]
  const selectedDetection = detections.find((item) => item.id === selectedId)
  const selectedFootprints = (selectedDetection?.detections ?? []).flatMap((item) =>
    (item?.obb?.coordinates ?? [])
      .filter((ring) => Array.isArray(ring) && ring.length >= 3)
      .map((ring) => ring.map(([lng, lat]) => [lat, lng])),
  )

  return (
    <div className="relative h-full w-full">
      <MapContainer
        ref={mapRef}
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        zoomControl={false}
        attributionControl={false}
        minZoom={5}
        maxZoom={19}
        zoomSnap={0.25}
        zoomDelta={0.5}
        className="z-0 h-full w-full"
      >
        <MapBridge mapRef={mapRef} onBoundsChange={onBoundsChange} />
        <AoiDrawer drawing={drawing} onCreated={onAoiCreated} onCancel={onAoiCancel} />
        <InspectionClicker enabled={inspectMode && !drawing} onInspect={onMapInspect} />

        <TileLayer
          key={basemapConfig.id}
          url={basemapConfig.url}
          attribution={basemapConfig.attribution}
          maxZoom={basemapConfig.maxZoom}
          maxNativeZoom={basemapConfig.maxNativeZoom}
        />
        {basemapConfig.labelsUrl ? (
          <Pane name="basemap-labels" style={{ zIndex: 150 }}>
            <TileLayer
              key={`${basemapConfig.id}-labels`}
              url={basemapConfig.labelsUrl}
              maxZoom={basemapConfig.maxZoom}
              maxNativeZoom={basemapConfig.maxNativeZoom}
              opacity={0.95}
            />
          </Pane>
        ) : null}

        <Pane name="dim-sectors" style={{ zIndex: 350 }}>
        {layers.dim
          ? sectors.map((sector) => (
              <Rectangle
                key={`dim-${sector.id}`}
                bounds={boundsToLatLngs(sector.bounds)}
                pathOptions={{
                  color: '#1e293b',
                  weight: 1,
                  dashArray: '5 6',
                  fillColor: MAP_COLORS.dim,
                  fillOpacity: 0.52,
                  interactive: false,
                }}
              />
            ))
          : null}
      </Pane>

      <Pane name="trb-rings" style={{ zIndex: 360 }}>
        {layers.rings
          ? trbRegistry.map((registry) => (
              <Circle
                key={`ring-${registry.id}`}
                center={[registry.lat, registry.lng]}
                radius={55}
                pathOptions={{
                  color: MAP_COLORS.trb,
                  weight: 1.4,
                  dashArray: '6 6',
                  fillColor: MAP_COLORS.trb,
                  fillOpacity: 0.035,
                  interactive: false,
                }}
              />
            ))
          : null}
      </Pane>

      <Pane name="zone-outline" style={{ zIndex: 370 }}>
        {selectedZone ? (
          <Rectangle
            bounds={selectedZone.bounds}
            pathOptions={{
              color: '#14b8a6',
              weight: 1.5,
              dashArray: '8 6',
              fillColor: '#14b8a6',
              fillOpacity: 0.025,
              interactive: false,
            }}
          />
        ) : null}
      </Pane>

      <Pane name="aoi-polygon" style={{ zIndex: 380 }}>
        {aoi ? (
          <Polygon
            positions={aoi.points}
            pathOptions={{
              color: '#5eead4',
              weight: 2,
              dashArray: '7 5',
              fillColor: '#14b8a6',
              fillOpacity: 0.08,
              interactive: false,
            }}
          >
            <Tooltip permanent direction="center" className="kutsaga-tooltip" opacity={1}>
              {aoi.label} · {formatArea(aoi.area)}
            </Tooltip>
          </Polygon>
        ) : null}
      </Pane>

      <Pane name="detection-boxes" style={{ zIndex: 390 }}>
        {layers.boxes
          ? detections.map((detection) => {
              const meta = STATUS_META[detection.status]
              return (
                <Rectangle
                  key={`box-${detection.id}`}
                  bounds={boundsToLatLngs(detection.bbox)}
                  pathOptions={{
                    color: meta.color,
                    weight: 1,
                    opacity: detection.status === 'rejected' ? 0.45 : 0.82,
                    dashArray: '3 3',
                    fillColor: meta.color,
                    fillOpacity: 0.025,
                    interactive: false,
                  }}
                />
              )
            })
          : null}
      </Pane>

      <Pane name="selected-barn" style={{ zIndex: 395 }}>
        {selectedDetection
          ? selectedFootprints.length
            ? selectedFootprints.map((positions, index) => (
                <Polygon
                  key={`selected-footprint-${index}`}
                  positions={positions}
                  pathOptions={{
                    color: '#22d3ee',
                    weight: 2.5,
                    fillColor: '#22d3ee',
                    fillOpacity: 0.18,
                    interactive: false,
                  }}
                >
                  {index === 0 ? (
                    <Tooltip permanent direction="top" className="kutsaga-tooltip" opacity={1}>
                      {selectedDetection.id} · exact barn footprint
                    </Tooltip>
                  ) : null}
                </Polygon>
              ))
            : (
                <Rectangle
                  bounds={boundsToLatLngs(selectedDetection.bbox)}
                  pathOptions={{
                    color: '#22d3ee',
                    weight: 2.5,
                    fillColor: '#22d3ee',
                    fillOpacity: 0.18,
                    interactive: false,
                  }}
                >
                  <Tooltip permanent direction="top" className="kutsaga-tooltip" opacity={1}>
                    {selectedDetection.id} · barn footprint
                  </Tooltip>
                </Rectangle>
              )
          : null}
      </Pane>

      {layers.trb
        ? trbRegistry.map((registry) => (
            <Marker
              key={registry.id}
              position={[registry.lat, registry.lng]}
              icon={trbIcon}
              interactive={!drawing && !inspectMode}
            >
              <Tooltip direction="top" offset={[0, -8]} className="kutsaga-tooltip" opacity={1}>
                <span className="font-semibold text-emerald-300">{registry.id}</span>
                <br />
                {registry.name}
                <br />
                Registered {formatDateTime(registry.registeredAt)}
              </Tooltip>
            </Marker>
          ))
        : null}

      {detections.map((detection) => (
        <Marker
          key={detection.id}
          position={[detection.lat, detection.lng]}
          icon={createDetectionIcon(detection, detection.id === selectedId)}
          interactive={!drawing && !inspectMode}
          eventHandlers={{ click: () => onDetectionSelect(detection.id) }}
        >
          <Tooltip direction="top" offset={[0, -10]} className="kutsaga-tooltip" opacity={1}>
            <span className="font-semibold" style={{ color: STATUS_META[detection.status].color }}>
              {detection.id}
            </span>{' '}
            · {STATUS_META[detection.status].label}
            <br />
            {detection.name} · {formatArea(detection.area)} · {Math.round(detection.confidence * 100)}%
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[400] shadow-[inset_0_0_130px_rgba(2,6,23,0.55)]" />
      <div className="pointer-events-none absolute bottom-1 left-1/2 z-[450] -translate-x-1/2 whitespace-nowrap rounded border border-slate-800/60 bg-slate-950/70 px-2 py-0.5 text-[8px] text-slate-500 backdrop-blur-sm">
        {basemapConfig.attribution}
      </div>
    </div>
  )
}
