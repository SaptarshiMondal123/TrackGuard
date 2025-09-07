from pathlib import Path
import cv2
import pandas as pd
import folium
import numpy as np
import time
from ultralytics import YOLO   # Using YOLO for track fault detection

# ---- Output filenames ---- #
VIDEO_OUT = "output_track_fault.mp4"
IMAGE_OUT = "output_track_fault.jpg"
CSV_OUT   = "alerts_track_fault.csv"
MAP_OUT   = "track_fault_map.html"

# ==== Load model once here ==== #
MODEL = YOLO(r"C:\Users\SAPTARSHI MONDAL\SnakeGame\Model\track_fault_detection.pt")   # <-- put your trained model path here

# ==== Risk scoring helpers ====
def braking_distance_m(speed_kmph, reaction_time_s, decel_mps2):
    v = max(0.0, speed_kmph) / 3.6
    return v * reaction_time_s + (v * v) / (2.0 * max(0.1, decel_mps2))

def risk_score(distance_to_fault_m, speed_kmph, reaction_time_s, decel_mps2):
    bd = braking_distance_m(speed_kmph, reaction_time_s, decel_mps2)
    score = max(0.0, 100.0 * (1 - (distance_to_fault_m / (2 * bd))))
    score = float(np.clip(score, 0, 100))
    if distance_to_fault_m > 2 * bd:
        level = "SAFE"
    elif distance_to_fault_m > bd:
        level = "CAUTION"
    else:
        level = "DANGER"
    return level, score


def run_inference_trackfault(input_path: str, device: str = "cpu", out_dir: str = "outputs",
                             speed_kmph: float = 80.0, reaction_time: float = 1.0, decel: float = 1.0) -> dict:
    """
    Run track fault detection using trained YOLO model (loaded inside file).
    """

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    inp = Path(input_path)
    ext = inp.suffix.lower()
    alerts = []
    start_t = time.time()

    # ---- Video mode ----
    if ext in [".mp4", ".avi", ".mov"]:
        cap = cv2.VideoCapture(str(inp))
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out_path = out_dir / VIDEO_OUT
        out = cv2.VideoWriter(str(out_path), fourcc, cap.get(cv2.CAP_PROP_FPS),
                              (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))))

        frame_id = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_id += 1

            results = MODEL(frame, device=device, verbose=False)[0]

            for box in results.boxes:
                cls_id = int(box.cls)
                cls_name = MODEL.names[cls_id]
                conf = float(box.conf)
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                if "fault" in cls_name.lower() or "defect" in cls_name.lower():
                    dist = 50.0
                    decision, risk_pct = risk_score(dist, speed_kmph, reaction_time, decel)
                    color = (0,255,0) if decision=="SAFE" else (0,255,255) if decision=="CAUTION" else (0,0,255)

                    alerts.append({
                        "frame": frame_id,
                        "time": round(time.time()-start_t,2),
                        "issue": cls_name,
                        "conf": round(conf,2),
                        "distance_m": dist,
                        "decision": decision,
                        "risk_pct": risk_pct
                    })
                else:
                    decision, risk_pct = "SAFE", 0
                    color = (0,200,0)

                label = f"{cls_name} {conf:.2f} {decision} {risk_pct:.0f}%"
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, label, (x1, max(20, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            out.write(frame)

        cap.release()
        out.release()

    # ---- Image mode ----
    elif ext in [".jpg", ".jpeg", ".png"]:
        img = cv2.imread(str(inp))
        out_path = out_dir / IMAGE_OUT

        results = MODEL(img, device=device, verbose=False)[0]

        for box in results.boxes:
            cls_id = int(box.cls)
            cls_name = MODEL.names[cls_id]
            conf = float(box.conf)
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            if "fault" in cls_name.lower() or "defect" in cls_name.lower():
                dist = 50.0
                decision, risk_pct = risk_score(dist, speed_kmph, reaction_time, decel)
                color = (0,255,0) if decision=="SAFE" else (0,255,255) if decision=="CAUTION" else (0,0,255)

                alerts.append({
                    "frame": 0,
                    "time": round(time.time()-start_t,2),
                    "issue": cls_name,
                    "conf": round(conf,2),
                    "distance_m": dist,
                    "decision": decision,
                    "risk_pct": risk_pct
                })
            else:
                decision, risk_pct = "SAFE", 0
                color = (0,200,0)

            label = f"{cls_name} {conf:.2f} {decision} {risk_pct:.0f}%"
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(img, label, (x1, max(20, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.imwrite(str(out_path), img)

    else:
        raise ValueError(f"Unsupported input type: {ext}")

    # ---- Save CSV ---- #
    csv_path = out_dir / CSV_OUT
    pd.DataFrame(alerts).to_csv(csv_path, index=False)

    # ---- Save map ---- #
    map_path = out_dir / MAP_OUT
    m = folium.Map(location=[28.61, 77.23], zoom_start=12)
    for i, row in enumerate(alerts):
        folium.Marker(
            location=[28.61 + i*0.001, 77.23 + i*0.001],
            popup=f"{row['issue']} {row['decision']} ({row['risk_pct']:.0f}%)",
            icon=folium.Icon(color="red" if row["decision"]=="DANGER" else "orange")
        ).add_to(m)
    m.save(str(map_path))

    return {
        "video": str(out_dir / VIDEO_OUT) if (out_dir / VIDEO_OUT).exists() else None,
        "image": str(out_dir / IMAGE_OUT) if (out_dir / IMAGE_OUT).exists() else None,
        "csv": str(csv_path),
        "map": str(map_path)
    }
