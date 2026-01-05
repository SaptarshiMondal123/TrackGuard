import React, { useState } from "react"

export default function SimulationSelector() {
  const [enabled, setEnabled] = useState(false)
  const [simulationType, setSimulationType] = useState<"obstacle" | "track" | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [videoSrc, setVideoSrc] = useState<string | null>(null)

  const API_BASE = "http://localhost:8000/simulation"

  const handleRun = async () => {
    if (!simulationType) {
      setMessage("⚠️ Please select a simulation type.")
      return
    }

    setLoading(true)
    setMessage("")
    setVideoSrc(null)

    try {
      const endpoint =
        simulationType === "obstacle"
          ? `${API_BASE}/obstacle`
          : `${API_BASE}/two_train`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: simulationType }),
      })

      if (!res.ok) throw new Error("Failed to start simulation")

      // 🔥 Handle binary video response
      const blob = await res.blob()
      const videoUrl = URL.createObjectURL(blob)
      setVideoSrc(videoUrl)
    } catch (err) {
      if (err instanceof Error) {
        setMessage(`❌ Error: ${err.message}`)
      } else {
        setMessage("❌ Unknown error occurred")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-gray-900 text-white shadow-lg rounded-2xl border border-gray-700 p-6">
      <h2 className="text-2xl font-bold mb-4 text-green-400">Simulation Control</h2>

      {/* Toggle */}
      <div className="flex items-center justify-between mb-4">
        <label htmlFor="simulation-toggle" className="font-medium">
          Show Simulation
        </label>
        <input
          id="simulation-toggle"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-5 h-5 accent-blue-500"
        />
      </div>

      {/* Simulation Type */}
      {enabled && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-2">Select Simulation Type</p>
          <div className="flex gap-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="obstacle"
                checked={simulationType === "obstacle"}
                onChange={() => setSimulationType("obstacle")}
                className="accent-green-500"
              />
              <span>🚧 Obstacle Simulation</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="track"
                checked={simulationType === "track"}
                onChange={() => setSimulationType("track")}
                className="accent-yellow-500"
              />
              <span>🛤️ Track Fault Simulation</span>
            </label>
          </div>
        </div>
      )}

      {/* Action Button */}
      {enabled && (
        <button
          onClick={handleRun}
          disabled={loading}
          className="w-full mt-2 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running..." : "Start Simulation"}
        </button>
      )}

      {/* Message */}
      {message && <p className="text-sm text-center mt-3">{message}</p>}

      {/* Video Player */}
      {videoSrc && (
        <div className="mt-4">
          <video src={videoSrc} controls autoPlay className="w-full rounded-lg shadow" />
        </div>
      )}
    </div>
  )
}