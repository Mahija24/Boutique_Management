import { useState, useRef } from "react";
import api from "../api/axios";
import {
  X,
  Image as ImageIcon,
  Save,
  Download,
  PenTool,
  Type,
  FileText,
  Mic,
  MicOff,
  Share2,
} from "lucide-react";
import { ReactSketchCanvas } from "react-sketch-canvas";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const WhiteboardModal = ({ order, onClose, fetchOrders }) => {
  // Combine all text data into one field
  const combineTextData = () => {
    const measurements = order.whiteboard?.measurements || "";
    const extraData = order.whiteboard?.extraData || "";
    const notes = order.whiteboard?.notes || "";

    let combined = "";
    if (measurements) combined += `MEASUREMENTS:\n${measurements}\n\n`;
    if (extraData) combined += `EXTRA DATA:\n${extraData}\n\n`;
    if (notes) combined += `SPECIAL REQUIREMENTS:\n${notes}`;

    return combined.trim();
  };

  const [extraDataAndNotes, setExtraDataAndNotes] = useState(combineTextData());
  const [imageUrls, setImageUrls] = useState(order.whiteboard?.imageUrls || []);
  const [drawingUrls, setDrawingUrls] = useState(
    order.whiteboard?.drawingUrls || [],
  );
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const canvasRef = useRef(null);
  const whiteboardRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioBlob(blob);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
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

  const shareContent = async () => {
    const shareData = {
      title: `Whiteboard for Order ${order.orderId}`,
      text: `Extra Data and Notes:\n${extraDataAndNotes}\n\nOrder: ${order.orderId}\nCustomer: ${order.customer?.name}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log("Share cancelled or failed:", error);
        // Fallback to clipboard
        copyToClipboard(shareData.text);
      }
    } else {
      // Fallback for browsers without Web Share API
      copyToClipboard(shareData.text);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Content copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Content copied to clipboard!");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls([...imageUrls, reader.result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const saveDrawing = async () => {
    if (canvasRef.current) {
      const drawingData = await canvasRef.current.exportImage("png");
      setDrawingUrls([...drawingUrls, drawingData]);
      canvasRef.current.clearCanvas();
    }
  };

  const removeDrawing = (index) => {
    setDrawingUrls(drawingUrls.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      await api.put(`/orders/${order._id}`, {
        whiteboard: {
          extraDataAndNotes,
          imageUrls,
          drawingUrls,
          audioBlob: audioBlob ? await blobToBase64(audioBlob) : null,
        },
      });
      fetchOrders();
      alert("Whiteboard saved!");
    } catch (error) {
      console.error(error);
      alert("Error saving whiteboard");
    }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generateOfficialBill = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(109, 40, 217);
    doc.text("OFFICIAL BILL", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Order & Customer Info
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const section1 = [
      { label: "Order ID:", value: order.orderId || "N/A" },
      { label: "Customer Name:", value: order.customer?.name || "N/A" },
      { label: "Phone:", value: order.customer?.phone || "N/A" },
    ];

    section1.forEach((item) => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 20, yPos);
      doc.setFont(undefined, "normal");
      doc.text(item.value, 70, yPos);
      yPos += 8;
    });

    yPos += 5;

    // Product Details
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("PRODUCT DETAILS", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);

    const section2 = [
      { label: "Product:", value: order.dressType || "N/A" },
      {
        label: "Fabric Details:",
        value: (order.fabricDetails || "N/A").substring(0, 50),
      },
    ];

    section2.forEach((item) => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 20, yPos);
      doc.setFont(undefined, "normal");
      doc.text(item.value, 70, yPos);
      yPos += 8;
    });

    yPos += 5;

    // Payment Section
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("PAYMENT DETAILS", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);

    const totalAmount = order.pricing?.totalAmount || 0;
    const advancePaid = order.pricing?.advancePaid || 0;
    const balance = totalAmount - advancePaid;

    const section3 = [
      { label: "Total Amount:", value: `₹ ${totalAmount.toLocaleString()}` },
      { label: "Advance Paid:", value: `₹ ${advancePaid.toLocaleString()}` },
      { label: "Balance Due:", value: `₹ ${balance.toLocaleString()}` },
    ];

    section3.forEach((item) => {
      doc.setFont(undefined, "bold");
      doc.text(item.label, 20, yPos);
      doc.setFont(undefined, "normal");
      const textWidth = doc.getTextWidth(item.value);
      doc.text(item.value, pageWidth - 20 - textWidth, yPos);
      yPos += 8;
    });

    yPos += 5;

    // Delivery Info
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("DELIVERY INFORMATION", 20, yPos);
    yPos += 8;
    doc.setFont(undefined, "normal");
    doc.setFontSize(11);

    const deliveryDate = new Date(order.deliveryDate).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

    doc.text(`Delivery Date: ${deliveryDate}`, 20, yPos);
    yPos += 8;
    doc.text(`Status: ${order.status}`, 20, yPos);
    yPos += 15;

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your business!", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 6;
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      yPos,
      { align: "center" },
    );

    doc.save(`${order.orderId}_Official_Bill.pdf`);
  };

  const generateCompleteBill = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(109, 40, 217);
    doc.text("COMPLETE ORDER REPORT", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;

    // Order Summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.text(
      `Order: ${order.orderId} | Customer: ${order.customer?.name}`,
      20,
      yPos,
    );
    yPos += 8;

    // Extra Data and Notes
    if (extraDataAndNotes) {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("EXTRA DATA AND NOTES:", 20, yPos);
      yPos += 6;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      const extraLines = doc.splitTextToSize(extraDataAndNotes, pageWidth - 40);
      doc.text(extraLines, 20, yPos);
      yPos += extraLines.length * 4 + 5;
    }

    // Add images if any
    if (imageUrls.length > 0) {
      yPos += 5;
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("REFERENCE IMAGES:", 20, yPos);
      yPos += 10;

      for (let i = 0; i < imageUrls.length; i++) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }
        doc.addImage(imageUrls[i], "JPEG", 20, yPos, 80, 60);
        yPos += 70;
      }
    }

    doc.save(`${order.orderId}_Complete_Report.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl my-8 flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50 sticky top-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-purple-600" /> Whiteboard -{" "}
            {order.orderId}
          </h2>
          <div className="flex gap-2 flex-wrap">
            {order.status === "Delivered" && (
              <>
                <button
                  onClick={generateOfficialBill}
                  className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-200"
                >
                  <FileText className="w-4 h-4" /> Official Bill
                </button>
                <button
                  onClick={generateCompleteBill}
                  className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-purple-200"
                >
                  <Download className="w-4 h-4" /> Complete Report
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-700"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6 flex flex-col">
              {/* Extra Data and Notes Section */}
              <div className="bg-white p-4 rounded-xl shadow-sm flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Type className="w-4 h-4" /> Extra Data and Notes
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 ${
                        isRecording
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      {isRecording ? "Stop Recording" : "Record Audio"}
                    </button>
                    <button
                      onClick={shareContent}
                      className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-200"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </div>
                <textarea
                  value={extraDataAndNotes}
                  onChange={(e) => setExtraDataAndNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  style={{ height: "calc(100% - 60px)" }}
                  placeholder="Enter measurements, extra data, special requirements, and any other notes here..."
                />
                {audioBlob && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mic className="w-4 h-4" /> Audio recording saved
                    </p>
                  </div>
                )}
                {audioBlob && (
                  <div className="mt-2 flex items-center gap-2">
                    <audio controls src={URL.createObjectURL(audioBlob)} className="mr-2" />
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(audioBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${order.orderId || 'recording'}_audio.wav`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold hover:bg-blue-200"
                    >
                      <Download className="w-4 h-4 inline-block mr-1" /> Download Audio
                    </button>
                  </div>
                )}
              </div>

              {/* Reference Images */}
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Reference Images
                </h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mb-3 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <div className="flex gap-2 flex-wrap">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt="ref"
                        className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas for Drawing */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <PenTool className="w-4 h-4" /> Draw / Sketch
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => canvasRef.current?.undo()}
                    className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    Undo
                  </button>
                  <button
                    onClick={() => canvasRef.current?.clearCanvas()}
                    className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
                  >
                    Clear
                  </button>
                  <button
                    onClick={saveDrawing}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold hover:bg-purple-200"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg flex-1 bg-white overflow-hidden">
                <ReactSketchCanvas
                  ref={canvasRef}
                  strokeWidth={2}
                  strokeColor="black"
                  width="100%"
                  height="100%"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
                {drawingUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={url}
                      alt="drawing"
                      className="h-20 w-20 object-contain bg-gray-50 rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => removeDrawing(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardModal;
