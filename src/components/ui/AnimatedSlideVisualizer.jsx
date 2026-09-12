import { useMemo } from 'react'
import GraphCanvas       from '../visualizations/GraphCanvas.jsx'
import ArrayBars         from '../visualizations/ArrayBars.jsx'
import MatrixGrid        from '../visualizations/MatrixGrid.jsx'
import ArrayPointers     from '../visualizations/ArrayPointers.jsx'
import TreeCanvas        from '../visualizations/TreeCanvas.jsx'
import LossLandscape     from '../visualizations/LossLandscape.jsx'
import ClusterPlot       from '../visualizations/ClusterPlot.jsx'
import HeatmapGrid       from '../visualizations/HeatmapGrid.jsx'
import TimelineStep      from '../visualizations/TimelineStep.jsx'
import DecisionBoundary  from '../visualizations/DecisionBoundary.jsx'
import NeuralNetDiagram  from '../visualizations/NeuralNetDiagram.jsx'
import VectorSpace       from '../visualizations/VectorSpace.jsx'
import ArchDiagram       from '../visualizations/ArchDiagram.jsx'
import StateDiagram      from '../visualizations/StateDiagram.jsx'

const VIZ_MAP = {
  'array-bars': ArrayBars,
  'array-pointers': ArrayPointers,
  'graph-canvas': GraphCanvas,
  'matrix-grid': MatrixGrid,
  'tree-canvas': TreeCanvas,
  'loss-landscape': LossLandscape,
  'cluster-plot': ClusterPlot,
  'heatmap-grid': HeatmapGrid,
  'timeline-step': TimelineStep,
  'decision-boundary': DecisionBoundary,
  'neural-net': NeuralNetDiagram,
  'vector-space': VectorSpace,
  'arch-diagram': ArchDiagram,
  'state-diagram': StateDiagram,
}

/**
 * Slide 2 Concept Visualizer for TikTok & Shorts Exporter.
 * Renders the exact same visualization component as on the site,
 * scaled to fit the slide frame, with compressed playback time.
 */
export default function AnimatedSlideVisualizer({
  concept,
  progress = 1.0,
  capturedVisualUrl,
  isExportResolution = false,
}) {
  const type = concept?.visualization?.type || 'array-bars'
  const VizComp = useMemo(() => VIZ_MAP[type] || ArrayBars, [type])

  // If user has a captured snapshot and is in static carousel mode, use captured image
  if (capturedVisualUrl && progress === 1.0) {
    return (
      <img
        src={capturedVisualUrl}
        alt={concept?.title || 'Concept Visualization'}
        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
      />
    )
  }

  // Scale to fit Slide 2 frame
  // - In export resolution (540x675 card), scale is 0.85 to fit container perfectly
  // - In preview mode (320-360px card), scale is 0.58
  const scale = isExportResolution ? 0.85 : 0.58

  return (
    <div className="w-full h-full flex items-center justify-center p-2 relative overflow-hidden bg-[#0b0e14] select-none">
      <div
        className="shrink-0 transition-transform duration-75 origin-center"
        style={{
          width: '520px',
          transform: `scale(${scale})`,
        }}
      >
        <VizComp
          config={concept?.visualization?.config ?? {}}
          data={concept?.visualization?.data}
          progress={progress}
          compact={true}
        />
      </div>
    </div>
  )
}
