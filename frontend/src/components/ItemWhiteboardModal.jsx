import { useState, useRef, useEffect, useId, useCallback } from "react";
import {
  X,
  Image as ImageIcon,
  Save,
  Download,
  PenTool,
  Mic,
  MicOff,
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  Trash,
} from "lucide-react";
import { ReactSketchCanvas } from "react-sketch-canvas";

const ItemWhiteboardModal = ({ item, itemIndex, onClose, onSave }) => {
  const uniqueBoardBaseId = useId();

  const createEmptyBoard = useCallback((index = 1) => ({
    id: `${uniqueBoardBaseId}-${index}`,
    title: `Board ${index}`,
    extraDataAndNotes: "",
    imageUrls: [],
    canvasPaths: [],
    audioNotes: [],
  }), [uniqueBoardBaseId]);

  const [whiteboards, setWhiteboards] = useState(() =>
    item?.whiteboards?.length ? item.whiteboards : [createEmptyBoard(1)],
  );
  const [activeBoard, setActiveBoard] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const canvasRef = useRef(null);
  const [strokeColor, setStrokeColor] = useState("black");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [zoom, setZoom] = useState(1);
  const canvasWidth = 1500;
  const canvasHeight = 1500;

  useEffect(() => {
    let mounted = true;
    const init = () => {
      const initialBoards =
        item?.whiteboards?.length > 0 ? item.whiteboards : [createEmptyBoard(1)];
      if (!mounted) return;
      setWhiteboards(initialBoards);
      setActiveBoard(0);
    };
    init();
    return () => { mounted = false; };
  }, [item, createEmptyBoard]);

  const currentBoard = whiteboards[activeBoard] || whiteboards[0];

  const addWhiteboard = () => {
    const newBoard = createEmptyBoard(whiteboards.length + 1);
    setWhiteboards([...whiteboards, newBoard]);
    setActiveBoard(whiteboards.length);
  };

  const deleteWhiteboard = (index) => {
    if (whiteboards.length === 1) {
      alert("At least one whiteboard is required.");
      return;
    }
    const newBoards = whiteboards.filter((_, i) => i !== index);
    setWhiteboards(newBoards);
    if (activeBoard >= newBoards.length) {
      setActiveBoard(newBoards.length - 1);
    }
  };

  const updateBoardField = (field, value) => {
    const updated = [...whiteboards];
    updated[activeBoard] = { ...updated[activeBoard], [field]: value };
    setWhiteboards(updated);
  };

  const startRecording = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(audioStream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const updated = [...whiteboards];
          updated[activeBoard].audioNotes.push(reader.result);
          setWhiteboards(updated);
        };
        reader.readAsDataURL(blob);
        audioStream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = [...whiteboards];
        updated[activeBoard].imageUrls.push(reader.result);
        setWhiteboards(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (imgIndex) => {
    const updated = [...whiteboards];
    updated[activeBoard].imageUrls = updated[activeBoard].imageUrls.filter(
      (_, i) => i !== imgIndex
    );
    setWhiteboards(updated);
  };

  const saveDrawing = async () => {
    if (canvasRef.current) {
      // export vector paths so drawings can be reloaded and edited later
      const paths = await canvasRef.current.exportPaths();
      const updated = [...whiteboards];
      updated[activeBoard].canvasPaths = updated[activeBoard].canvasPaths || [];
      updated[activeBoard].canvasPaths.push(paths);
      setWhiteboards(updated);
      canvasRef.current.clearCanvas();
      alert("Drawing saved (paths)!");
    }
  };

  const undoDrawing = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const redoDrawing = () => {
    if (canvasRef.current) {
      canvasRef.current.redo();
    }
  };

  const clearCanvasDrawing = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  };

  const exportCanvasImage = async () => {
    if (canvasRef.current) {
      const dataUrl = await canvasRef.current.exportImage("png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${item.productType || `item-${itemIndex + 1}`}-whiteboard.png`;
      link.click();
    }
  };

  const removeDrawing = (drawIndex) => {
    const updated = [...whiteboards];
    updated[activeBoard].canvasPaths = updated[activeBoard].canvasPaths.filter(
      (_, i) => i !== drawIndex
    );
    setWhiteboards(updated);
  };

  const loadSavedDrawing = async (index) => {
    const paths = currentBoard.canvasPaths?.[index];
    if (paths && canvasRef.current) {
      await canvasRef.current.loadPaths(paths);
    }
  };

  const removeAudio = (audioIndex) => {
    const updated = [...whiteboards];
    updated[activeBoard].audioNotes = updated[activeBoard].audioNotes.filter(
      (_, i) => i !== audioIndex
    );
    setWhiteboards(updated);
  };

  const handleSave = async () => {
    try {
      await onSave(whiteboards);
      alert("Whiteboards saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving whiteboards:", error);
      alert("Error saving whiteboards");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-5 bg-gradient-to-r from-purple-50 to-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Design Workspace — {item.productType || `Item ${itemIndex + 1}`}
            </h2>
            <p className="text-sm text-gray-500">Tailoring workspace for sketches, embroidery marks, and notes.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-3 bg-gray-50 overflow-x-auto">
          <div className="flex flex-wrap items-center gap-2">
            {whiteboards.map((board, idx) => (
              <button
                key={board.id}
                onClick={() => setActiveBoard(idx)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeBoard === idx
                    ? "bg-purple-600 text-white shadow"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {board.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={addWhiteboard}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <Plus className="w-4 h-4" /> New Board
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentBoard && (
            <>
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Board Title
                </label>
                <input
                  type="text"
                  value={currentBoard.title}
                  onChange={(e) => updateBoardField("title", e.target.value)}
                  className="w-full border border-gray-300 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Front Design"
                />
              </div>

              {/* Notes & Measurements */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Notes & Measurements
                </label>
                <textarea
                  value={currentBoard.extraDataAndNotes}
                  onChange={(e) => updateBoardField("extraDataAndNotes", e.target.value)}
                  className="w-full min-h-[100px] resize-none border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Measurements, special instructions, fabric details, etc."
                />
              </div>

              {/* Canvas for Drawing */}
              <div className="rounded-2xl border border-gray-300 bg-white overflow-hidden flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-gray-700" />
                    <span className="text-sm font-semibold text-gray-700">Whiteboard Canvas</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={saveDrawing}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600"
                    >
                      Save Drawing
                    </button>
                    <button
                      type="button"
                      onClick={undoDrawing}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300"
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={redoDrawing}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300"
                    >
                      Redo
                    </button>
                    <button
                      type="button"
                      onClick={clearCanvasDrawing}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={exportCanvasImage}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600"
                    >
                      Export
                    </button>

                    {/* Pen color */}
                    <div className="flex items-center gap-2 ml-2">
                      {[["black"],["red"],["blue"],["green"]].map((c) => (
                        <button
                          key={c}
                          onClick={() => setStrokeColor(c[0])}
                          className={`w-6 h-6 rounded-full border ${strokeColor === c[0] ? "ring-2 ring-offset-1 ring-purple-500" : ""}`}
                          style={{ backgroundColor: c[0] }}
                          aria-label={`Set color ${c[0]}`}
                        />
                      ))}
                    </div>

                    {/* Stroke width */}
                    <div className="flex items-center gap-2 ml-2">
                      {[1, 3, 5, 8].map((w) => (
                        <button
                          key={w}
                          onClick={() => setStrokeWidth(w)}
                          className={`px-2 py-1 rounded text-xs border ${strokeWidth === w ? "bg-gray-800 text-white" : "bg-white text-gray-700"}`}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>

                    {/* Zoom */}
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(1)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg"
                      >
                        100%
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-lg"
                      >
                        +
                      </button>
                    </div>

                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-white" style={{ maxHeight: "calc(70vh - 60px)" }}>
                  <div
                    className="w-full"
                    style={{
                      minHeight: "420px",
                      height: "calc(70vh - 60px)",
                      backgroundImage:
                        "linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg,#eee 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  >
                    <ReactSketchCanvas
                      ref={canvasRef}
                      width={canvasWidth}
                      height={canvasHeight}
                      strokeColor={strokeColor}
                      strokeWidth={strokeWidth}
                      backgroundColor="#ffffff"
                      allowOnlyPointerType="all"
                      style={{ touchAction: "none", width: "100%", height: "100%" }}
                      canvasStyle={{ width: "100%", height: "100%", minHeight: "420px", backgroundColor: "#ffffff" }}
                    />
                  </div>
                </div>
              </div>

              {/* Saved Drawings */}
              {currentBoard.canvasPaths && currentBoard.canvasPaths.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Saved Drawings</h3>
                    <span className="text-xs text-gray-500">{currentBoard.canvasPaths.length} drawing(s)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {currentBoard.canvasPaths.map((paths, idx) => (
                      <div key={idx} className="relative group border rounded-lg p-3 bg-gray-50">
                        <div className="text-xs text-gray-600 mb-2">Drawing {idx + 1}</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => loadSavedDrawing(idx)}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDrawing(idx)}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Images */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Reference Images
                  </h3>
                  <label className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 cursor-pointer">
                    <Plus className="w-3 h-3" /> Add Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {currentBoard.imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {currentBoard.imageUrls.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Reference ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white p-1 rounded-full transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Notes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mic className="w-4 h-4" /> Audio Notes
                  </h3>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600"
                    >
                      <Mic className="w-3 h-3" /> Record
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600"
                    >
                      <MicOff className="w-3 h-3" /> Stop
                    </button>
                  )}
                </div>
                {currentBoard.audioNotes.length > 0 && (
                  <div className="space-y-2">
                    {currentBoard.audioNotes.map((audio, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <audio
                          src={audio}
                          controls
                          className="flex-1 h-8"
                        />
                        <button
                          type="button"
                          onClick={() => removeAudio(idx)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete Board Button */}
              {whiteboards.length > 1 && (
                <button
                  type="button"
                  onClick={() => deleteWhiteboard(activeBoard)}
                  className="w-full px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium hover:bg-red-100"
                >
                  Delete This Board
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
          >
            <Save className="w-4 h-4" /> Save All Whiteboards
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemWhiteboardModal;
