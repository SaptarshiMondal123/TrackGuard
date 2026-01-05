# TrackGuard

TrackGuard is an AI-powered railway safety demo that:

- Detects obstacles in rail videos (YOLO)
- Detects track faults/defects in track images (YOLO)
- Produces downloadable artifacts (annotated media, CSV alerts, and an HTML map)
- Provides two 3D/offscreen simulations rendered to video (Panda3D)

This repository contains:

- A **FastAPI backend** (inference + simulation endpoints)
- A **React + Vite + Tailwind frontend** (upload UI + results dashboard)

---

## Project structure

```
TrackGuard/
	Backend/
		main_object.py                # FastAPI app (API entrypoint)
		inference_object.py           # obstacle detection pipeline
		inference_track.py            # track fault pipeline
		train_fault_3dsimulation.py   # Panda3D simulation (track fault ahead)
		train_obstacle_3dsimulation.py# Panda3D simulation (two trains)
		Model/
			yolov8m-worldv2.pt
			track_fault_detection.pt
	frontend/
		src/
			App.tsx
			components/
				VideoUpload.tsx
				TrackUplod.tsx
				Dashboard.tsx
				SimulationSelector.tsx
```

---

## Prerequisites

### Backend

- Python 3.10+ (3.11 recommended)
- `ffmpeg` on your PATH (recommended; used for browser-compatible H.264 outputs)

Python packages used by the backend include FastAPI + Uvicorn as well as ML/video libs.

> Note: `Backend/requirements.txt` currently lists only a subset of packages. See “Install backend dependencies” below.

### Frontend

- Node.js 18+ and npm

---

## Setup

### 1) Install backend dependencies

From the repo root:

```bash
cd Backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# Install base requirements
pip install -r requirements.txt

# Install remaining runtime deps used by inference/sim
pip install ultralytics opencv-python numpy pandas

# If you want to run simulations
pip install panda3d
```

If you have an NVIDIA GPU and a compatible setup, you can optionally install PyTorch with CUDA for faster inference (Ultralytics will use it automatically). Otherwise CPU inference works.

### 2) Model weights

By default, the backend loads weights from `Backend/Model/`:

- `Backend/Model/yolov8m-worldv2.pt` (obstacle detection)
- `Backend/Model/track_fault_detection.pt` (track fault detection)

If you want to keep weights elsewhere, you can override paths via environment variables (no code changes):

- `TRACKGUARD_OBJECT_MODEL` → full path to obstacle model weights (`.pt`)
- `TRACKGUARD_TRACK_MODEL` → full path to track-fault model weights (`.pt`)

Windows PowerShell example:

```powershell
$env:TRACKGUARD_OBJECT_MODEL = "C:\path\to\yolov8m-worldv2.pt"
$env:TRACKGUARD_TRACK_MODEL  = "C:\path\to\track_fault_detection.pt"
uvicorn main_object:app --reload --host 127.0.0.1 --port 8000
```

Linux/macOS example:

```bash
export TRACKGUARD_OBJECT_MODEL=/path/to/yolov8m-worldv2.pt
export TRACKGUARD_TRACK_MODEL=/path/to/track_fault_detection.pt
uvicorn main_object:app --reload --host 127.0.0.1 --port 8000
```

### 3) Install frontend dependencies

```bash
cd frontend
npm install
```

---

## Run the project (local)

### 1) Start the backend (FastAPI)

From `Backend/`:

```bash
uvicorn main_object:app --reload --host 127.0.0.1 --port 8000
```

Backend will create (if missing):

- `Backend/uploads/` for uploaded inputs
- `Backend/outputs/` for generated artifacts

You can view interactive API docs at:

- http://127.0.0.1:8000/docs

### 2) Start the frontend (Vite)

From `frontend/`:

```bash
npm run dev
```

Open the printed Vite URL (typically http://localhost:5173).

> The frontend currently calls the backend at `http://127.0.0.1:8000` directly (see `VideoUpload.tsx` and `TrackUplod.tsx`).

---

## How it works

### Obstacle detection (video)

- Upload a rail video in the UI.
- Frontend sends `POST /analyze/object` with:
	- `file`: video
	- `speed`: train speed (km/h) as form field
- Backend runs YOLO inference, annotates frames, and writes:
	- `Backend/outputs/output_avc1.mp4` (annotated output)
	- `Backend/outputs/alerts.csv` (detections/alerts)
	- `Backend/outputs/map.html` (Folium HTML map)

### Track fault detection (image or video)

- Upload a track image (or a supported video) in the UI.
- Frontend sends `POST /analyze/track` with `file`.
- Backend runs the track-fault YOLO model and writes:
	- `Backend/outputs/output_track_fault.jpg` OR `Backend/outputs/output_track_fault.mp4`
	- `Backend/outputs/alerts_track_fault.csv`
	- `Backend/outputs/track_fault_map.html`

### Simulations (Panda3D offscreen → video)

The backend also exposes two simulation endpoints that render a short video offscreen:

- Two-train braking simulation: `POST /simulation/two_train`
- Obstacle scenario simulation: `POST /simulation/obstacle`

Both return a video file response when finished. These may take some time to generate.

---

## API reference (backend)

Base URL: `http://127.0.0.1:8000`

### Analysis

- `POST /analyze/object`
	- Multipart form: `file` (video), `speed` (float)
	- Returns JSON with artifact download paths

- `POST /analyze/track`
	- Multipart form: `file` (image or video)
	- Returns JSON with artifact download paths

### Artifact downloads

Obstacle detection:

- `GET /download/video` → MP4
- `GET /download/csv` → CSV
- `GET /download/map` → HTML

Track fault detection:

- `GET /download/track/video` → MP4 (if video output exists)
- `GET /download/track/image` → JPG (if image output exists)
- `GET /download/track/csv` → CSV
- `GET /download/track/map` → HTML

### Simulations

- `POST /simulation/two_train` → MP4
- `POST /simulation/obstacle` → MP4

---

## Outputs and persistence

The backend writes artifacts using fixed filenames inside `Backend/outputs/`.
That means each new run overwrites previous outputs.

Uploads are saved in `Backend/uploads/`.

Simulation videos are written to `Backend/output/`.

---

## Troubleshooting

### “Model file not found” / inference crashes immediately

- Ensure the `.pt` weights exist in `Backend/Model/`.
- If you store weights elsewhere, update the model path constants in the inference files.

### Output video won’t play in the browser

- Install `ffmpeg` and ensure `ffmpeg` is on PATH.
- The obstacle pipeline re-encodes to H.264/AVC1 for broad browser compatibility.

### Frontend uploads work but results links 404

- Confirm the backend is running and finished processing.
- Check that `Backend/outputs/` contains the expected files.
- Remember outputs are overwritten per run.

### CORS issues

Backend currently allows all origins (`allow_origins=["*"]`). If you lock this down, update it to include your frontend origin.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
