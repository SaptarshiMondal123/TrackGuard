from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse, HTMLResponse
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
from train_fault_3dsimulation import router as train_router
from train_obstacle_3dsimulation import router as obstacle_router

from inference_object import run_inference          # object detection
from inference_track import run_inference_trackfault  # track fault detection

app = FastAPI(title="TrackGuard API", version="2.0")

# ---------------- MIDDLEWARE ---------------- #
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust to your frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- DIRECTORIES ---------------- #
BASE_DIR = Path(__file__).parent.resolve()
UPLOAD_DIR = BASE_DIR / "uploads"
OUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)
OUT_DIR.mkdir(exist_ok=True)

CHUNK_SIZE = 1024 * 1024  # 1MB


def iterfile(path: Path):
    """Stream a file in chunks."""
    with open(path, "rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            yield chunk


# =====================================================
# OBJECT DETECTION ENDPOINT
# =====================================================
@app.post("/analyze/object")
async def analyze_object(file: UploadFile, speed: float = Form(80.0)):
    """Upload video -> run OBJECT detection -> return artifact URLs."""
    dest = UPLOAD_DIR / Path(file.filename).name
    with open(dest, "wb") as out_f:
        shutil.copyfileobj(file.file, out_f)

    try:
        results = await run_in_threadpool(run_inference, str(dest), float(speed), "cpu")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Object inference error: {e}")

    artifacts = {
        "video": "/download/video",
        "csv": "/download/csv",
        "map": "/download/map",
    }

    return JSONResponse(content={"message": "Object detection complete", "artifacts": artifacts})


# =====================================================
# TRACK FAULT DETECTION ENDPOINT
# =====================================================
@app.post("/analyze/track")
async def analyze_track(file: UploadFile):
    """Upload video/image -> run TRACK FAULT detection -> return artifact URLs."""
    dest = UPLOAD_DIR / Path(file.filename).name
    with open(dest, "wb") as out_f:
        shutil.copyfileobj(file.file, out_f)

    try:
        results = await run_in_threadpool(run_inference_trackfault, str(dest), "cpu", str(OUT_DIR))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Track fault inference error: {e}")

    artifacts = {
        "video": "/download/track/video" if results.get("video") else None,
        "image": "/download/track/image" if results.get("image") else None,
        "csv": "/download/track/csv",
        "map": "/download/track/map",
    }

    return JSONResponse(content={"message": "Track fault detection complete", "artifacts": artifacts})


# =====================================================
# DOWNLOADS (OBJECT DETECTION)
# =====================================================
@app.get("/download/video")
async def download_video():
    video_file = OUT_DIR / "output_avc1.mp4"
    if not video_file.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    return StreamingResponse(
        iterfile(video_file),
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"}
    )


@app.get("/download/csv")
async def download_csv():
    csv_file = OUT_DIR / "alerts.csv"
    if not csv_file.exists():
        raise HTTPException(status_code=404, detail="CSV not found")
    return FileResponse(csv_file, media_type="text/csv", filename="alerts.csv")


@app.get("/download/map", response_class=HTMLResponse)
async def download_map():
    map_file = OUT_DIR / "map.html"
    if not map_file.exists():
        raise HTTPException(status_code=404, detail="Map not found")
    return HTMLResponse(content=map_file.read_text(encoding="utf-8"))


# =====================================================
# DOWNLOADS (TRACK FAULT)
# =====================================================
@app.get("/download/track/video")
async def download_track_video():
    video_file = OUT_DIR / "output_track_fault.mp4"
    if not video_file.exists():
        raise HTTPException(status_code=404, detail="Track fault video not found")
    return FileResponse(video_file, media_type="video/mp4", filename="track_fault.mp4")


@app.get("/download/track/image")
async def download_track_image():
    img_file = OUT_DIR / "output_track_fault.jpg"
    if not img_file.exists():
        raise HTTPException(status_code=404, detail="Track fault image not found")
    return FileResponse(img_file, media_type="image/jpeg", filename="track_fault.jpg")


@app.get("/download/track/csv")
async def download_track_csv():
    csv_file = OUT_DIR / "alerts_track_fault.csv"
    if not csv_file.exists():
        raise HTTPException(status_code=404, detail="Track fault CSV not found")
    return FileResponse(csv_file, media_type="text/csv", filename="alerts_track_fault.csv")


@app.get("/download/track/map", response_class=HTMLResponse)
async def download_track_map():
    map_file = OUT_DIR / "track_fault_map.html"
    if not map_file.exists():
        raise HTTPException(status_code=404, detail="Track fault map not found")
    return HTMLResponse(content=map_file.read_text(encoding="utf-8"))

# include routers
app.include_router(train_router, prefix="/simulation", tags=["Two Train Simulation"])
app.include_router(obstacle_router, prefix="/simulation", tags=["Obstacle Simulation"])