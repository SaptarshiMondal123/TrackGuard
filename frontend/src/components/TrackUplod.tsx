import React, { useState, useRef } from "react";
import { Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";

interface TrackUploadProps {
  onAnalysisComplete?: (artifacts: { csv?: string; map?: string; image?: string }) => void;
}

const TrackUpload: React.FC<TrackUploadProps> = ({ onAnalysisComplete }) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setUploadedImage(url);

      const formData = new FormData();
      formData.append("file", file);

      try {
        setLoading(true);
        const res = await fetch("http://127.0.0.1:8000/analyze/track", {
          method: "POST",
          body: formData,
        });

        const rawText = await res.text();
        console.log("📩 Raw backend response (track fault):", rawText);

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${rawText}`);

        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("❌ Response is not valid JSON: " + rawText);
        }

        const base = "http://127.0.0.1:8000";
        const artifacts = {
          image: base + data.artifacts.image,
          csv: base + data.artifacts.csv,
          map: base + data.artifacts.map,
        };

        setResults({ ...data, artifacts });

        if (onAnalysisComplete) {
          onAnalysisComplete(artifacts);
        }
      } catch (err: any) {
        console.error("❌ Upload/Analysis failed:", err);
        setResults({ error: err.message || "Unknown error occurred" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFileSelect(files[0]);
  };

  const clearImage = () => {
    if (uploadedImage) URL.revokeObjectURL(uploadedImage);
    setUploadedImage(null);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section id="track" className="py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Detect <span className="text-green-400">Track Faults</span>
          </h2>
          <p className="text-gray-300 text-xl max-w-2xl mx-auto">
            Upload a railway track image for AI-powered fault detection
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {!uploadedImage ? (
            <div
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                transition-all duration-300 transform hover:scale-[1.02]
                ${isDragOver 
                  ? "border-green-400 bg-green-400/5 shadow-lg shadow-green-400/20" 
                  : "border-gray-600 hover:border-green-400 hover:bg-green-400/5"}
              `}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center space-y-6">
                <div className={`
                  p-6 rounded-full transition-all duration-300
                  ${isDragOver ? "bg-green-400/20 scale-110" : "bg-gray-800"}
                `}>
                  <ImageIcon className={`w-12 h-12 ${isDragOver ? "text-green-400" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Upload Rail Track Image
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Drag and drop your image here, or click to browse
                  </p>
                  <div className="inline-flex px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all">
                    Choose Image File
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Track Fault Analysis</h3>
                <button
                  onClick={clearImage}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden border-2 border-green-400/30 shadow-lg shadow-green-400/10">
                <img src={uploadedImage} alt="Uploaded track" className="w-full h-auto max-h-[500px] object-contain bg-black" />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-10 h-10 animate-spin text-green-400" />
                  </div>
                )}
              </div>

              {results && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  {results.error ? (
                    <p className="text-red-400 font-medium whitespace-pre-wrap">
                      ❌ Debug Error: {results.error}
                    </p>
                  ) : (
                    <>
                      <p className="text-green-400 font-medium mb-1">✓ {results.message}</p>
                      {results.artifacts?.image && (
                        <img src={results.artifacts.image} alt="Analysis result" className="w-full h-auto mt-4 rounded-lg" />
                      )}
                      {results.artifacts?.csv && (
                        <div className="mt-4">
                          <a href={results.artifacts.csv} className="text-blue-400 underline" target="_blank" rel="noreferrer">
                            Download Faults CSV
                          </a>
                        </div>
                      )}
                      {results.artifacts?.map && (
                        <div className="mt-4">
                          <a href={results.artifacts.map} className="text-blue-400 underline" target="_blank" rel="noreferrer">
                            View Fault Map
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TrackUpload;