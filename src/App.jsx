import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApprovalQueueCard } from './components/ApprovalQueueCard'
import { BasemapSwitcher } from './components/BasemapSwitcher'
import { DetectionInspector } from './components/DetectionInspector'
import { LoginScreen } from './components/LoginScreen'
import { ManualInspectionDialog } from './components/ManualInspectionDialog'
import { NationalScanCard } from './components/NationalScanCard'
import { MapLayersPanel } from './components/MapLayersPanel'
import { MapLegendPanel } from './components/MapLegendPanel'
import { MapViewport } from './components/MapViewport'
import { RejectionTaxonomyDialog } from './components/RejectionTaxonomyDialog'
import { ReviewFiltersCard } from './components/ReviewFiltersCard'
import { ScanSectorCard } from './components/ScanSectorCard'
import { ScanTelemetryCard } from './components/ScanTelemetryCard'
import { SidebarHeader } from './components/SidebarHeader'
import { ToastStack } from './components/ToastStack'
import { ZoomControls } from './components/ZoomControls'
import { useAuth } from './hooks/useAuth'
import { useDashboardState } from './hooks/useDashboardState'
import { useMacroScans } from './hooks/useMacroScans'
import { MAP_CENTER, MAP_ZOOM, ZONES } from './lib/constants'
import { isActiveMacroJob } from './lib/macroJobs'
import {
  boundsFromLeaflet,
  boundsOfPoints,
  formatArea,
  geodesicArea,
} from './lib/geo'
import { captureTileGrid } from './lib/imagery'

const boundsObjectFromArray = (bounds) => ({
  south: bounds[0][0],
  west: bounds[0][1],
  north: bounds[1][0],
  east: bounds[1][1],
})

const pointsFromBounds = (bounds) => [
  { lat: bounds.south, lng: bounds.west },
  { lat: bounds.south, lng: bounds.east },
  { lat: bounds.north, lng: bounds.east },
  { lat: bounds.north, lng: bounds.west },
]

const MAX_AOI_AREA = 10_000_000

const clampAoi = (points, bounds) => {
  const area = geodesicArea(points)
  if (area <= MAX_AOI_AREA) return { points, bounds, clipped: false }

  const scale = Math.sqrt(MAX_AOI_AREA / area) * 0.98
  const centerLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length
  const centerLng = points.reduce((sum, point) => sum + point.lng, 0) / points.length
  const clippedPoints = points.map((point) => ({
    lat: centerLat + (point.lat - centerLat) * scale,
    lng: centerLng + (point.lng - centerLng) * scale,
  }))

  return {
    points: clippedPoints,
    bounds: boundsOfPoints(clippedPoints),
    clipped: true,
  }
}

const Dashboard = ({ user, onSignOut }) => {
  const [livePollingEnabled, setLivePollingEnabled] = useState(true)
  const dashboard = useDashboardState({ livePollingEnabled })
  const userRole = String(user?.role ?? 'unknown')
  const canLaunchMacro = ['admin', 'api'].includes(userRole.toLowerCase())
  const macro = useMacroScans({
    addToast: dashboard.addToast,
    enabled: canLaunchMacro,
    pollingEnabled: livePollingEnabled,
  })
  const mapRef = useRef(null)
  const [layers, setLayers] = useState({
    trb: true,
    rings: true,
    boxes: true,
    dim: true,
  })
  const [zoneId, setZoneId] = useState('')
  const [basemap, setBasemap] = useState('google')
  const [aoi, setAoi] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [confidence, setConfidence] = useState(0.65)
  const [inspectMode, setInspectMode] = useState(false)
  const [inspectionPoint, setInspectionPoint] = useState(null)
  const [taxonomySelection, setTaxonomySelection] = useState(null)

  const selectedZone = ZONES.find((zone) => zone.id === zoneId) ?? null
  const running = dashboard.scanStatus === 'RUNNING'

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== 'b') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      const tagName = target?.tagName?.toLowerCase()
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable
      ) {
        return
      }
      setLayers((current) => ({ ...current, boxes: !current.boxes }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleLayer = useCallback((key) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }))
  }, [])

  const handleZoneChange = useCallback(
    (nextZoneId) => {
      setZoneId(nextZoneId)
      setAoi(null)
      setDrawing(false)
      setInspectMode(false)
      setInspectionPoint(null)
      const zone = ZONES.find((item) => item.id === nextZoneId)
      if (zone && mapRef.current) {
        mapRef.current.fitBounds(zone.bounds, {
          padding: [70, 70],
          maxZoom: 17,
          animate: true,
          duration: 0.8,
        })
      }
    },
    [],
  )

  const handleCurrentSector = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const bounds = boundsFromLeaflet(map.getBounds())
    const points = pointsFromBounds(bounds)
    setZoneId('')
    setAoi({
      points,
      bounds,
      area: geodesicArea(points),
      label: 'Current viewport',
    })
    setDrawing(false)
    setInspectMode(false)
    dashboard.addToast('Current viewport captured as a scan sector', 'info')
  }, [dashboard])

  const handleAoiCreated = useCallback(
    (points) => {
      if (!points?.length) return
      const bounds = boundsOfPoints(points)
      const area = geodesicArea(points)
      setAoi({ points, bounds, area, label: 'Drawn AOI' })
      setZoneId('')
      setDrawing(false)
      setInspectMode(false)
      dashboard.addToast(`AOI captured · ${formatArea(area)}`, 'success')
    },
    [dashboard],
  )

  const handleAoiCancel = useCallback(() => {
    setDrawing(false)
  }, [])

  const handleDrawAoi = useCallback(() => {
    setInspectMode(false)
    setInspectionPoint(null)
    setDrawing((current) => !current)
  }, [])

  const handleClearSector = useCallback(() => {
    setAoi(null)
    setZoneId('')
    setDrawing(false)
    setInspectMode(false)
    setInspectionPoint(null)
    dashboard.clearScan()
    dashboard.addToast('Scan sector cleared', 'info')
  }, [dashboard])

  const handleRunScan = useCallback(async () => {
    if (running) return
    setInspectMode(false)
    setInspectionPoint(null)
    const map = mapRef.current
    let label = 'Current viewport'
    let bounds = null
    let points = null

    if (selectedZone) {
      label = selectedZone.name
      bounds = boundsObjectFromArray(selectedZone.bounds)
      points = pointsFromBounds(bounds)
    } else if (aoi) {
      label = aoi.label
      bounds = aoi.bounds
      points = aoi.points
    } else if (map) {
      bounds = boundsFromLeaflet(map.getBounds())
      points = pointsFromBounds(bounds)
      setAoi({
        points,
        bounds,
        area: geodesicArea(points),
        label: 'Current viewport',
      })
    }

    if (!points?.length && !bounds) {
      dashboard.addToast('Unable to determine a scan sector', 'error')
      return
    }

    const fitted = clampAoi(points, bounds)
    points = fitted.points
    bounds = fitted.bounds
    if (fitted.clipped) {
      setAoi({ points, bounds, area: geodesicArea(points), label })
      dashboard.addToast('Area clipped to the 10 km² scan limit', 'info')
    }

    const success = await dashboard.runScan({ label, points, bounds, confidence })
    if (success) setInspectMode(true)
  }, [aoi, confidence, dashboard, running, selectedZone])

  const handleSelectDetection = useCallback(
    (detectionId) => {
      dashboard.selectDetection(detectionId)
      const detection = dashboard.allDetections.find((item) => item.id === detectionId)
      const map = mapRef.current
      if (detection && map) {
        map.flyTo([detection.lat, detection.lng], Math.max(map.getZoom(), 18), {
          animate: true,
          duration: 0.9,
        })
      }
    },
    [dashboard],
  )

  const handleResetView = useCallback(() => {
    mapRef.current?.setView(MAP_CENTER, MAP_ZOOM)
  }, [])

  const handleMapInspect = useCallback((latlng) => {
    setInspectionPoint(latlng)
  }, [])

  const handleCloseInspection = useCallback(() => {
    setInspectionPoint(null)
  }, [])

  const handleCaptureMapArea = useCallback(async () => {
    const map = mapRef.current
    if (!map) throw new Error('Map is not ready')
    const center = map.getCenter()
    return captureTileGrid(center.lat, center.lng, map.getZoom())
  }, [])

  const fitMacroBounds = useCallback((bounds) => {
    if (!bounds || !mapRef.current) return
    mapRef.current.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      { padding: [70, 70], maxZoom: 14, animate: true, duration: 0.8 },
    )
  }, [])

  const handleQuickConfirm = useCallback(
    (detectionId) => {
      dashboard.submitReview(detectionId, 'approved')
    },
    [dashboard],
  )

  const handleQuickReject = useCallback(
    (detectionId) => {
      dashboard.selectDetection(detectionId)
      setTaxonomySelection({
        detectionId,
        code: null,
        token: Date.now(),
        autoSubmit: true,
      })
    },
    [dashboard],
  )

  const handleToggleSpatialFilter = useCallback(() => {
    dashboard.setBboxEnabled((current) => !current)
  }, [dashboard])

  const handleWatchGlobal = useCallback(() => {
    setLivePollingEnabled(true)
    dashboard.setActiveTab('global')
    dashboard.setStatusFilter('waiting')
    dashboard.setBboxEnabled(false)
    dashboard.addToast('Watching new candidates in Waiting approval', 'info')
  }, [dashboard])

  const handleActivateJob = useCallback(
    (jobId) => {
      setLivePollingEnabled(true)
      dashboard.activateJob(jobId)
    },
    [dashboard],
  )

  const handleToggleLivePolling = useCallback(() => {
    const next = !livePollingEnabled
    setLivePollingEnabled(next)
    dashboard.addToast(
      next
        ? 'Live review polling resumed'
        : 'Live review paused — the Azure scan keeps running',
      'info',
    )
  }, [dashboard, livePollingEnabled])

  const handleLaunchMacro = useCallback(async () => {
    const result = await macro.launch(confidence)
    const firstJob = result?.jobs?.[0]
    if (firstJob) {
      setLivePollingEnabled(true)
      dashboard.activateJob(firstJob.job_id)
      fitMacroBounds(firstJob.bounds)
    }
  }, [confidence, dashboard, fitMacroBounds, macro])

  const completedMacroIds = useMemo(
    () =>
      new Set(
        macro.jobs
          .filter((job) => String(job.status ?? '').toUpperCase() === 'COMPLETED')
          .map((job) => job.job_id),
      ),
    [macro.jobs],
  )
  const seenMacroIds = useRef(null)
  const pollRegistry = dashboard.pollRegistry
  const scanJobId = dashboard.scanJobId
  const hasActiveMacro = useMemo(() => macro.jobs.some(isActiveMacroJob), [macro.jobs])

  useEffect(() => {
    if (seenMacroIds.current === null) {
      seenMacroIds.current = completedMacroIds
      return
    }
    const newlyCompleted = [...completedMacroIds].find(
      (jobId) => !seenMacroIds.current.has(jobId),
    )
    seenMacroIds.current = completedMacroIds
    if (!newlyCompleted) return
    dashboard.refresh(newlyCompleted)
    dashboard.addToast('Macro scan results loaded into the review queue', 'success')
  }, [completedMacroIds, dashboard])

  useEffect(() => {
    if (!livePollingEnabled) return undefined
    const activeJobId = hasActiveMacro ? scanJobId : null
    const poll = () => {
      if (!document.hidden) pollRegistry(activeJobId)
    }
    poll()
    const timer = window.setInterval(poll, activeJobId ? 4000 : 8000)
    return () => window.clearInterval(timer)
  }, [hasActiveMacro, livePollingEnabled, pollRegistry, scanJobId])

  useEffect(() => {
    if (!taxonomySelection?.autoSubmit || !taxonomySelection.code) return
    dashboard.submitReview(
      taxonomySelection.detectionId,
      'rejected',
      taxonomySelection.code,
    )
    setTaxonomySelection(null)
  }, [taxonomySelection, dashboard])

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase()
      if (key !== 'c' && key !== 'r') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      const tagName = target?.tagName?.toLowerCase()
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable
      ) {
        return
      }
      const detectionId = dashboard.selectedId
      if (!detectionId) {
        dashboard.addToast('Select a candidate first to use C / R shortcuts', 'info')
        return
      }
      event.preventDefault()
      if (key === 'c') handleQuickConfirm(detectionId)
      else handleQuickReject(detectionId)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dashboard, handleQuickConfirm, handleQuickReject])

  return (
    <div className="app-shell relative w-full overflow-hidden bg-[#020617] text-slate-100">
      <MapViewport
        mapRef={mapRef}
        detections={dashboard.allDetections}
        trbRegistry={dashboard.trbRegistry}
        sectors={dashboard.sectors}
        layers={layers}
        basemap={basemap}
        aoi={aoi}
        selectedZone={selectedZone}
        selectedId={dashboard.selectedId}
        drawing={drawing}
        inspectMode={inspectMode}
        onAoiCreated={handleAoiCreated}
        onAoiCancel={handleAoiCancel}
        onDetectionSelect={handleSelectDetection}
        onMapInspect={handleMapInspect}
        onBoundsChange={dashboard.setMapBounds}
      />

      <div className="pointer-events-none absolute right-3 top-3 z-[950] xl:right-[342px]">
        <div className="pointer-events-auto">
          <BasemapSwitcher basemap={basemap} onChange={setBasemap} />
        </div>
      </div>

      {inspectMode ? (
        <div className="pointer-events-none absolute left-[402px] right-4 top-4 z-[950] hidden justify-center sm:flex xl:right-[342px]">
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-teal-400/35 bg-slate-950/90 px-3 py-1.5 text-[9px] text-teal-200 shadow-xl backdrop-blur-md">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-teal-300" />
            <span className="truncate">Manual inspection: click a barn to view its Z18 crop</span>
            <button
              type="button"
              onClick={() => setInspectMode(false)}
              className="shrink-0 rounded-full border border-slate-700/80 px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
            >
              Exit
            </button>
          </div>
        </div>
      ) : null}

      <aside className="pointer-events-none absolute inset-y-0 left-0 z-[1000] w-[390px] max-w-[calc(100vw-0.5rem)]">
        <div className="kutsaga-scroll pointer-events-auto flex h-full flex-col gap-2.5 overflow-y-auto p-3 pr-1.5">
          <SidebarHeader user={user} onSignOut={onSignOut} />
          <ScanSectorCard
            zoneId={zoneId}
            onZoneChange={handleZoneChange}
            onCurrentSector={handleCurrentSector}
            onDrawAoi={handleDrawAoi}
            drawing={drawing}
            confidence={confidence}
            onConfidenceChange={setConfidence}
            onRun={handleRunScan}
            onClear={handleClearSector}
            running={running}
            aoi={aoi}
            geminiLocate={dashboard.geminiLocate}
            onGeminiLocateChange={dashboard.toggleGeminiLocate}
            geminiStatus={dashboard.geminiStatus}
          />
          <ScanTelemetryCard
            telemetry={dashboard.telemetry}
            scanStatus={dashboard.scanStatus}
          />
          <NationalScanCard
            boundaries={macro.boundaries}
            selectedBoundaryId={macro.selectedBoundaryId}
            onBoundaryChange={macro.setSelectedBoundaryId}
            estimate={macro.estimate}
            estimateLoading={macro.estimateLoading}
            jobs={macro.jobs}
            loading={macro.loading}
            launching={macro.launching}
            resumingId={macro.resumingId}
            error={macro.error}
            confidence={confidence}
            canLaunch={canLaunchMacro}
            restricted={!canLaunchMacro}
            role={userRole}
            livePollingEnabled={livePollingEnabled}
            onLaunch={handleLaunchMacro}
            onWatchGlobal={handleWatchGlobal}
            onToggleLivePolling={handleToggleLivePolling}
            onResume={macro.resume}
            onActivateJob={handleActivateJob}
            onFitBounds={fitMacroBounds}
          />
          <ApprovalQueueCard
            activeTab={dashboard.activeTab}
            onTabChange={dashboard.setActiveTab}
            counts={dashboard.counts}
            statusFilter={dashboard.statusFilter}
            onStatusFilter={dashboard.selectStatusFilter}
            page={dashboard.page}
            pageCount={dashboard.pageCount}
            onPageChange={dashboard.setPage}
            rows={dashboard.pageRows}
            filteredTotal={dashboard.filteredDetections.length}
            selectedId={dashboard.selectedId}
            onSelectDetection={handleSelectDetection}
            onRemoveDetection={dashboard.removeDetection}
            onRemoveAll={dashboard.removeAllDetections}
            onConfirm={handleQuickConfirm}
            onReject={handleQuickReject}
            reviewing={dashboard.reviewing}
            onExport={dashboard.exportRejectedToLearning}
            exporting={dashboard.exporting}
            loading={dashboard.loading}
            live={livePollingEnabled}
            onToggleLivePolling={handleToggleLivePolling}
          />
          <ReviewFiltersCard
            statusFilter={dashboard.statusFilter}
            onStatusChange={dashboard.setStatusFilter}
            trbFilter={dashboard.trbFilter}
            onTrbChange={dashboard.setTrbFilter}
            bandFilter={dashboard.bandFilter}
            onBandChange={dashboard.setBandFilter}
            minPriority={dashboard.minPriority}
            onMinPriorityChange={dashboard.setMinPriority}
            bboxEnabled={dashboard.bboxEnabled}
            onBboxChange={handleToggleSpatialFilter}
            onReset={dashboard.resetFilters}
            onOpenTaxonomy={() => dashboard.setTaxonomyOpen(true)}
          />
          <div className="pb-1 text-center">
            <button
              type="button"
              onClick={handleResetView}
              className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-600 transition hover:text-cyan-400"
            >
              Reset map view
            </button>
          </div>
        </div>
      </aside>

      <aside className="pointer-events-none absolute inset-y-0 right-0 z-[1000] hidden w-[330px] flex-col gap-2.5 p-3 pl-0 xl:flex">
        <div className="pointer-events-auto self-end">
          <ZoomControls mapRef={mapRef} />
        </div>
        <div className="pointer-events-auto flex min-h-0 flex-1 flex-col">
          <MapLayersPanel
            layers={layers}
            onToggleLayer={toggleLayer}
            sectors={dashboard.sectors}
            onDeleteSector={dashboard.deleteSector}
          />
        </div>
        <div className="pointer-events-auto">
          <MapLegendPanel />
        </div>
      </aside>

      <DetectionInspector
        detection={dashboard.selectedDetection}
        onClose={dashboard.clearSelection}
        onReview={dashboard.submitReview}
        reviewing={dashboard.reviewing}
        onOpenTaxonomy={() => dashboard.setTaxonomyOpen(true)}
        taxonomySelection={taxonomySelection}
      />

      <ManualInspectionDialog
        point={inspectionPoint}
        onClose={handleCloseInspection}
        onCaptureMapArea={handleCaptureMapArea}
      />

      <RejectionTaxonomyDialog
        open={dashboard.taxonomyOpen}
        onClose={() => dashboard.setTaxonomyOpen(false)}
        selectedCode={taxonomySelection?.code ?? dashboard.selectedDetection?.rejectionReason}
        onSelectReason={(code) => {
          setTaxonomySelection((current) => ({
            ...current,
            code,
            token: Date.now(),
          }))
          dashboard.setTaxonomyOpen(false)
        }}
      />

      <ToastStack toasts={dashboard.toasts} onDismiss={dashboard.dismissToast} />
    </div>
  )
}

export default function App() {
  const auth = useAuth()

  if (!auth.ready) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#020617] text-slate-500">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
          Connecting to Kutsaga API…
        </span>
      </div>
    )
  }

  if (!auth.user) {
    return <LoginScreen onSubmit={auth.signIn} pending={auth.pending} error={auth.error} />
  }

  return <Dashboard user={auth.user} onSignOut={auth.signOut} />
}
