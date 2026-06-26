import { useState, useEffect } from "react";
import api from "../api/axios";
import {
  Search,
  Plus,
  X,
  Edit,
  Trash2,
  Calendar,
  IndianRupee,
  Filter,
  Columns,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  PenTool,
  FileText,
  Download,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ItemWhiteboardModal from "../components/ItemWhiteboardModal";
import AddItemModal from "../components/AddItemModal";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";

const blouseTopMeasurements = [
  { key: "fullLength", label: "Full Length" },
  { key: "fullShoulder", label: "Full Shoulder" },
  { key: "shoulderStrap", label: "Shoulder Strap" },
  { key: "backNeckDepth", label: "Back Neck Depth" },
  { key: "frontNeckDepth", label: "Front Neck Depth" },
  { key: "point", label: "Point" },
  { key: "frontLength", label: "Front Length" },
  { key: "upperBust", label: "Upper Bust" },
  { key: "bustAround", label: "Bust Around" },
  { key: "waistAround", label: "Waist Around" },
  { key: "tummy", label: "Tummy" },
  { key: "seat", label: "Seat" },
  { key: "slitOpen", label: "Slit Open" },
  { key: "armHole", label: "Arm Hole" },
  { key: "armRound", label: "Arm Round" },
  { key: "sleeveLength", label: "Sleeve Length" },
  { key: "sleeveRound", label: "Sleeve Round" },
  { key: "biceps", label: "Biceps" },
];

const pantMeasurements = [
  { key: "length", label: "Length" },
  { key: "hip", label: "Hip" },
  { key: "thigh", label: "Thigh" },
  { key: "knee", label: "Knee" },
  { key: "ankle", label: "Ankle" },
];

const skirtMeasurements = [
  { key: "halfLength", label: "Half Length" },
  { key: "fullLength", label: "Full Length" },
  { key: "hip", label: "Hip" },
  { key: "seat", label: "Seat" },
];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All Products");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const [scheduleData, setScheduleData] = useState(null);
  const [activeItemWhiteboard, setActiveItemWhiteboard] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [editingScheduleData, setEditingScheduleData] = useState(null);
  const [scheduleEditForm, setScheduleEditForm] = useState({
    cuttingEndDate: "",
    stitchingEndDate: "",
    trialEndDate: "",
    finalWorkEndDate: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: "",
    method: "Cash",
    transactionId: "",
  });
  const [customerHistoryItems, setCustomerHistoryItems] = useState([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState("Orders");
  const { user } = useAuth();

  const initialForm = {
    customer: "",
    customerName: "",
    customerPhone: "",
    address: "",
    orderType: "New stitching",
    fabricDetails: "",
    assignedStaff: "",
    items: [],
    pricing: { advancePaid: "" },
  };
  const [formData, setFormData] = useState(initialForm);

  const getTotalAmount = () =>
    formData.items.reduce((total, item) => total + Number(item.totalCost || 0), 0);

  const getBalance = () =>
    getTotalAmount() - (Number(formData.pricing.advancePaid) || 0);

  const expandMeasurements = (measurements = {}) => {
    const entries = measurements instanceof Map ? Array.from(measurements.entries()) : Object.entries(measurements);
    if (measurements.blouse || measurements.top || measurements.pant || measurements.skirt) {
      return measurements;
    }

    const expanded = {
      blouse: {},
      top: {},
      pant: {},
      skirt: {},
    };

    entries.forEach(([key, value]) => {
      const [section, field] = key.split("_");
      if (expanded[section] && field) {
        expanded[section][field] = value;
      }
    });

    return expanded;
  };

  const flattenMeasurements = (measurements = {}) => {
    if (!measurements || typeof measurements !== "object") return {};
    
    // If it's already flat (has keys like "blouse_fullLength"), return as-is
    const keys = Object.keys(measurements);
    if (keys.some(k => k.includes("_"))) {
      return measurements;
    }

    // Convert nested format (sections) to flat format
    const flattened = {};
    Object.entries(measurements).forEach(([section, fields]) => {
      if (typeof fields === "object" && fields !== null) {
        Object.entries(fields).forEach(([field, value]) => {
          if (value) {
            flattened[`${section}_${field}`] = String(value);
          }
        });
      }
    });
    
    return flattened;
  };

  const normalizeSavedItem = (item) => ({
    productType: item.productType || item.dressType || "",
    designType: item.designType || "",
    quantity: item.quantity || 1,
    costPerPiece: item.costPerPiece || item.cost || item.price || 0,
    totalCost: item.totalCost || (item.quantity || 1) * (item.costPerPiece || item.cost || item.price || 0),
    deliveryDate: item.deliveryDate || "",
    measurements: expandMeasurements(item.measurements),
    options: item.options || item.selectedOptions || [],
    customOptions: item.customOptions || [],
    customMeasurements: item.customMeasurements || [],
    notes: item.notes || "",
    whiteboards: item.whiteboards || [],
    aiSchedule: item.aiSchedule || {},
    itemStatus: item.itemStatus || "Measurement done",
    sameMeasurementFrom: item.sameMeasurementFrom || null,
  });

  const saveNewItem = (item) => {
    setFormData((prev) => {
      const items = [...prev.items];
      if (editingItemIndex !== null) {
        items[editingItemIndex] = item;
      } else {
        items.push(item);
      }
      return { ...prev, items };
    });
    setEditingItemIndex(null);
  };

  const closeAddItem = () => {
    setIsAddItemOpen(false);
    setEditingItemIndex(null);
  };

  const handleItemRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemEdit = (index) => {
    setEditingItemIndex(index);
    setIsAddItemOpen(true);
  };

  const openItemWhiteboard = (item, index) => {
    setActiveItemWhiteboard({ item, index });
  };

  const saveItemWhiteboards = async (whiteboards) => {
    if (!activeItemWhiteboard) {
      console.warn("saveItemWhiteboards called but no activeItemWhiteboard");
      throw new Error("No active whiteboard target");
    }

    try {
      const itemsPayload = formData.items.map((itm, idx) =>
        idx === activeItemWhiteboard.index ? { ...itm, whiteboards } : itm,
      );

      setFormData((prev) => ({ ...prev, items: itemsPayload }));

      // Sanitize whiteboards for API: convert canvasPaths to JSON strings and keep only expected fields
      const sanitizedItems = itemsPayload.map((it) => {
        const sanitizedWhiteboards = (it.whiteboards || []).map((wb) => ({
          id: wb.id,
          title: wb.title,
          extraDataAndNotes: wb.extraDataAndNotes || "",
          imageUrls: wb.imageUrls || [],
          audioNotes: wb.audioNotes || [],
          drawingUrls: (wb.drawingUrls && wb.drawingUrls.length)
            ? wb.drawingUrls
            : (wb.canvasPaths ? wb.canvasPaths.map((p) => JSON.stringify(p)) : []),
        }));
        return {
          dressType: it.productType || it.dressType || "",
          designType: it.designType || "",
          quantity: it.quantity || 1,
          costPerPiece: it.costPerPiece || 0,
          totalCost: it.totalCost || 0,
          deliveryDate: it.deliveryDate,
          measurements: flattenMeasurements(it.measurements),
          selectedOptions: it.options || it.selectedOptions || [],
          customOptions: it.customOptions || [],
          customMeasurements: it.customMeasurements || [],
          notes: it.notes || "",
          voiceNotes: it.voiceNotes || [],
          whiteboards: sanitizedWhiteboards,
          aiSchedule: it.aiSchedule || {},
          itemStatus: it.itemStatus || "Measurement done",
        };
      });

      if (editingOrder && editingOrder._id) {
        const { data } = await api.put(`/orders/${editingOrder._id}`, { items: sanitizedItems });
        await fetchOrders();
        toast.success("Whiteboard saved!");
        return data;
      } else {
        toast.success("Whiteboard updated (will save with order)");
        return sanitizedItems;
      }
    } catch (error) {
      console.error("Failed to save whiteboard", error.response?.data || error);
      const msg = error?.response?.data?.message || error?.message || "Unknown error";
      toast.error(`Could not save whiteboard: ${msg}`);
      throw error;
    }
  };

  const getLatestItemDeliveryDate = (items) => {
    const validDates = items
      .map((item) => new Date(item.deliveryDate))
      .filter((date) => !isNaN(date));
    if (validDates.length === 0) return null;
    return new Date(Math.max(...validDates.map((date) => date.getTime())));
  };

  const getItemAIGuess = (item) => {
    const start = new Date();
    const end = item.deliveryDate ? new Date(item.deliveryDate) : new Date(start);

    const totalDays = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)),
    );

    let cuttingDays = Math.max(1, Math.floor(totalDays * 0.22));
    let stitchingDays = Math.max(2, Math.floor(totalDays * 0.42));
    let trialDays = Math.max(1, Math.floor(totalDays * 0.18));
    let finalDays = totalDays - cuttingDays - stitchingDays - trialDays;
    if (finalDays < 1) finalDays = 1;

    const cuttingEnd = new Date(start);
    cuttingEnd.setDate(cuttingEnd.getDate() + cuttingDays);

    const stitchingEnd = new Date(cuttingEnd);
    stitchingEnd.setDate(stitchingEnd.getDate() + stitchingDays);

    const trialEnd = new Date(stitchingEnd);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    const finalEnd = new Date(trialEnd);
    finalEnd.setDate(finalEnd.getDate() + finalDays);

    return {
      cutting: { startDate: start.toISOString(), endDate: cuttingEnd.toISOString(), status: "Pending" },
      stitching: { startDate: cuttingEnd.toISOString(), endDate: stitchingEnd.toISOString(), status: "Pending" },
      trial: { startDate: stitchingEnd.toISOString(), endDate: trialEnd.toISOString(), status: "Pending" },
      finalWork: { startDate: trialEnd.toISOString(), endDate: finalEnd.toISOString(), status: "Pending" },
    };
  };

  const applyItemSchedule = async (index) => {
    const item = formData.items?.[index];
    if (!item) {
      toast.error("Unable to generate schedule: item not found.");
      return;
    }
    const schedule = getItemAIGuess(item);
    try {
      const itemsPayload = formData.items.map((itm, idx) => {
        if (idx === index) {
          return {
            dressType: itm.productType || itm.dressType || "",
            designType: itm.designType || "",
            quantity: itm.quantity || 1,
            costPerPiece: itm.costPerPiece || 0,
            totalCost: itm.totalCost || 0,
            deliveryDate: itm.deliveryDate,
            measurements: flattenMeasurements(itm.measurements),
            selectedOptions: itm.options || itm.selectedOptions || [],
            customOptions: itm.customOptions || [],
            customMeasurements: itm.customMeasurements || [],
            notes: itm.notes || "",
            voiceNotes: itm.voiceNotes || [],
            whiteboards: itm.whiteboards || [],
            aiSchedule: schedule,
            itemStatus: itm.itemStatus || "Measurement done",
          };
        }
        return itm;
      });

      setFormData((prev) => ({ ...prev, items: itemsPayload }));

      if (editingOrder) {
        await api.put(`/orders/${editingOrder._id}`, { items: itemsPayload });
        await fetchOrders();
        toast.success("Schedule generated and saved!");
      } else {
        toast.success("Schedule generated (will save with order)");
      }
    } catch (error) {
      console.error("Failed to save schedule", error);
      toast.error("Could not save schedule");
    }
  };

  const applyOrderItemSchedule = async (order, index) => {
    const item = order?.items?.[index];
    if (!item) {
      toast.error("Unable to generate schedule: item not found in order.");
      return;
    }

    const schedule = getItemAIGuess(item);
    const itemsPayload = order.items.map((itm, idx) =>
      idx === index ? { ...itm, aiSchedule: schedule } : itm,
    );

    try {
      await api.put(`/orders/${order._id}`, { items: itemsPayload });
      await fetchOrders();
      toast.success("Item schedule generated and saved for this order.");
    } catch (error) {
      console.error("Failed to save order item schedule", error);
      toast.error("Could not save item schedule");
    }
  };

  const editOrderItemSchedule = async (order, index) => {
    const item = order?.items?.[index];
    if (!item) {
      toast.error("Unable to edit schedule: item not found in order.");
      return;
    }

    const schedule = item.aiSchedule || {};
    setScheduleEditForm({
      cuttingEndDate:
        schedule.cutting?.endDate || schedule.cuttingEndDate || "",
      stitchingEndDate:
        schedule.stitching?.endDate || schedule.stitchingEndDate || "",
      trialEndDate:
        schedule.trial?.endDate || schedule.trialEndDate || "",
      finalWorkEndDate:
        schedule.finalWork?.endDate || schedule.finalWorkEndDate || "",
    });
    setEditingScheduleData({ order, index });
  };

  const saveEditedSchedule = async () => {
    if (!editingScheduleData) return;
    try {
      const updatedSchedule = {
        cutting: { endDate: scheduleEditForm.cuttingEndDate },
        stitching: { endDate: scheduleEditForm.stitchingEndDate },
        trial: { endDate: scheduleEditForm.trialEndDate },
        finalWork: { endDate: scheduleEditForm.finalWorkEndDate },
      };

      const itemsPayload = editingScheduleData.order.items.map((itm, idx) =>
        idx === editingScheduleData.index ? { ...itm, aiSchedule: updatedSchedule } : itm,
      );
      await api.put(`/orders/${editingScheduleData.order._id}`, { items: itemsPayload });
      await fetchOrders();
      toast.success("Item schedule updated.");
      setEditingScheduleData(null);
      setScheduleEditForm({
        cuttingEndDate: "",
        stitchingEndDate: "",
        trialEndDate: "",
        finalWorkEndDate: "",
      });
    } catch (err) {
      console.error('Failed to update item schedule', err);
      toast.error('Invalid schedule data or failed to save schedule');
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date)) return value;
    return date.toLocaleDateString("en-GB");
  };

  const fetchOrders = async () => {
    try {
      const { data } = await api.get(`/orders`);
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [custData, staffData] = await Promise.all([
        api.get("/customers"),
        api.get("/staff"),
      ]);
      setCustomers(custData.data);
      setStaffList(staffData.data);
    } catch (error) {
      console.error("Failed to fetch dependencies", error);
    }
  };

  const fetchCustomerHistory = async (customerId) => {
    if (!customerId) {
      setCustomerHistoryItems([]);
      return;
    }
    try {
      const { data } = await api.get(`/orders?customer=${customerId}`);
      const items = (data || []).flatMap((order) => order.items || []);
      setCustomerHistoryItems(items);
    } catch (error) {
      console.error("Failed to fetch customer order history", error);
    }
  };

  useEffect(() => {
    // Only run once on mount to fetch initial data
    const initDependencies = async () => {
      await Promise.all([fetchDependencies(), fetchOrders()]);
    };
    initDependencies();
  }, []); // Empty dependency array - runs only on mount

  useEffect(() => {
    // Separate effect for handling customer selection changes
    const handleSelection = async () => {
      const selectedCustomer = customers.find(
        (cust) =>
          cust._id === formData.customer ||
          cust.phone === formData.customerPhone ||
          cust.name?.toLowerCase() === formData.customerName.trim().toLowerCase(),
      );
      if (selectedCustomer) {
        if (selectedCustomer._id !== formData.customer) {
          setFormData((prev) => ({ ...prev, customer: selectedCustomer._id }));
        }
        await fetchCustomerHistory(selectedCustomer._id);
      } else {
        setCustomerHistoryItems([]);
      }
    };
    if (customers.length > 0) {
      handleSelection();
    }
  }, [formData.customerPhone, formData.customerName, formData.customer, customers.length]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "advancePaid") {
      setFormData({
        ...formData,
        pricing: { ...formData.pricing, [name]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setFormData(initialForm);
    setModalStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalStep === 2 && formData.items.length === 0) {
      alert("Please add at least one item to the order.");
      return;
    }

    if (modalStep < (user?.role === "Owner" ? 3 : 2)) {
      setModalStep(modalStep + 1);
      return;
    }

    try {
      const calculatedTotal = getTotalAmount();
      const latestDeliveryDate = getLatestItemDeliveryDate(formData.items);
      if (!latestDeliveryDate) {
        alert("Please add at least one item with a delivery date.");
        return;
      }
      const advancePaid = Number(formData.pricing.advancePaid || 0);
      const payload = {
        ...formData,
        deliveryDate: latestDeliveryDate.toISOString(),
        orderType: formData.orderType,
        items: formData.items.map((item) => ({
          dressType: item.productType || item.dressType || "",
          designType: item.designType || "",
          quantity: item.quantity || 1,
          costPerPiece: item.costPerPiece || 0,
          totalCost: item.totalCost || 0,
          deliveryDate: item.deliveryDate || latestDeliveryDate,
          measurements: {
            ...Object.entries(item.measurements?.blouse || {}).reduce(
              (acc, [key, value]) => ({ ...acc, [`blouse_${key}`]: value }),
              {},
            ),
            ...Object.entries(item.measurements?.top || {}).reduce(
              (acc, [key, value]) => ({ ...acc, [`top_${key}`]: value }),
              {},
            ),
            ...Object.entries(item.measurements?.pant || {}).reduce(
              (acc, [key, value]) => ({ ...acc, [`pant_${key}`]: value }),
              {},
            ),
            ...Object.entries(item.measurements?.skirt || {}).reduce(
              (acc, [key, value]) => ({ ...acc, [`skirt_${key}`]: value }),
              {},
            ),
          },
          selectedOptions: item.options || item.selectedOptions || [],
          customOptions: item.customOptions || [],
          customMeasurements: item.customMeasurements || [],
          notes: item.notes || "",
          voiceNotes: item.voiceNotes || [],
          whiteboards: item.whiteboards || [],
          aiSchedule: item.aiSchedule || {},
          itemStatus: item.itemStatus || "Measurement done",
        })),
        pricing: {
          totalAmount: calculatedTotal,
          advancePaid,
          balance: calculatedTotal - advancePaid,
        },
      };

      if (!payload.customer) {
        const matchedCustomer = customers.find(
          (cust) =>
            cust.phone === formData.customerPhone ||
            cust.name?.toLowerCase() === formData.customerName.trim().toLowerCase(),
        );

        if (matchedCustomer) {
          payload.customer = matchedCustomer._id;
        } else {
          const customerPayload = {
            name: formData.customerName,
            phone: formData.customerPhone,
            address: formData.address || undefined,
          };
          const { data: createdCustomer } = await api.post(
            "/customers",
            customerPayload,
          );
          payload.customer = createdCustomer._id;
        }
      }

      if (!payload.assignedStaff) delete payload.assignedStaff;

      let createdOrder;
      if (editingOrder) {
        const { data: updatedOrder } = await api.put(`/orders/${editingOrder._id}`, payload);
        createdOrder = updatedOrder;
        toast.success("Order updated successfully!");
      } else {
        const { data } = await api.post("/orders", payload);
        createdOrder = data;
      }
      
      closeModal();
      await fetchOrders();
      
      // Auto-generate PDFs if new order
      if (!editingOrder && createdOrder) {
        setTimeout(() => {
          generateOfficialBill(createdOrder);
          generateCompleteReport(createdOrder);
          toast.success("Order created! PDFs generated.");
        }, 500);
      }
    } catch (error) {
      console.error("Failed to save order", error);
      const errorMsg = error.response?.data?.message || error.message || "Error saving order";
      toast.error(errorMsg);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payments", {
        orderId: paymentOrder._id,
        amountPaid: Number(paymentForm.amountPaid),
        method: paymentForm.method,
        transactionId: paymentForm.transactionId,
      });
      setPaymentOrder(null);
      setPaymentForm({ amountPaid: "", method: "Cash", transactionId: "" });
      fetchOrders();
    } catch (error) {
      console.error("Failed to record payment", error);
      alert(error.response?.data?.message || "Error recording payment");
    }
  };

  const generateOrdersPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    doc.setFontSize(18);
    doc.text("Orders Export", pageWidth / 2, y, { align: "center" });
    y += 12;
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 10;

    const exportOrders = orders;
    exportOrders.forEach((order, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(`${index + 1}. ${order.orderId} (${order.customer?.name || "Unknown"})`, 20, y);
      y += 6;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(`Status: ${order.status || "N/A"}`, 20, y);
      doc.text(`Delivery: ${new Date(order.deliveryDate).toLocaleDateString("en-GB")}`, 100, y);
      y += 5;
      doc.text(`Total: ₹${order.pricing?.totalAmount || 0}`, 20, y);
      doc.text(`Advance: ₹${order.pricing?.advancePaid || 0}`, 70, y);
      doc.text(`Balance: ₹${order.pricing?.balance || 0}`, 122, y);
      y += 8;
      if (order.items?.length) {
        const itemNames = order.items.map((item) => item.productType || item.designType || "Item").join(", ");
        doc.text(`Items: ${itemNames}`, 20, y);
        y += 8;
      }
      y += 2;
    });
    doc.save(`Orders_Export_${Date.now()}.pdf`);
  };

  const generatePaymentsPDF = async () => {
    try {
      const { data } = await api.get("/payments");
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 20;

      doc.setFontSize(18);
      doc.text("Payments Export", pageWidth / 2, y, { align: "center" });
      y += 12;
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
      y += 10;

      data.forEach((payment, index) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(`${index + 1}. ${payment.order?.orderId || "N/A"}`, 20, y);
        y += 6;
        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        doc.text(`Customer: ${payment.order?.customer?.name || "Unknown"}`, 20, y);
        y += 5;
        doc.text(`Amount: ₹${payment.amountPaid || 0}`, 20, y);
        doc.text(`Method: ${payment.method || "N/A"}`, 85, y);
        y += 5;
        doc.text(`Transaction: ${payment.transactionId || "—"}`, 20, y);
        y += 7;
      });
      doc.save(`Payments_Export_${Date.now()}.pdf`);
    } catch (error) {
      console.error("Failed to export payments", error);
      alert("Unable to export payments. Please try again.");
    }
  };

  const generateMeasurementsPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    doc.setFontSize(18);
    doc.text("Measurements Export", pageWidth / 2, y, { align: "center" });
    y += 12;
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 10;

    const items = orders.flatMap((order) =>
      (order.items || []).map((item) => ({
        ...item,
        orderId: order.orderId,
        customerName: order.customer?.name || "Unknown",
      })),
    );

    items.forEach((item, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(`${index + 1}. ${item.productType || item.designType || "Item"}`, 20, y);
      y += 6;
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(`Order: ${item.orderId} | Customer: ${item.customerName}`, 20, y);
      y += 5;
      doc.text(`Delivery: ${new Date(item.deliveryDate).toLocaleDateString("en-GB")}`, 20, y);
      y += 5;
      const measurementText = Object.entries(item.measurements || {})
        .flatMap(([section, values]) =>
          Object.entries(values || {}).map(([key, value]) =>
            `${section}.${key}: ${value}`,
          ),
        )
        .join(", ");
      doc.text(`Measurements: ${measurementText || "None"}`, 20, y, { maxWidth: pageWidth - 40 });
      y += 10;
    });
    doc.save(`Measurements_Export_${Date.now()}.pdf`);
  };

  const generateCombinedPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    const addSectionTitle = (title) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text(title, 20, y);
      y += 8;
    };

    addSectionTitle("Orders Report");
    doc.setFontSize(10);
    orders.slice(0, 8).forEach((order, idx) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${idx + 1}. ${order.orderId} - ${order.customer?.name || "N/A"}`, 20, y);
      y += 5;
    });

    doc.addPage();
    y = 20;
    addSectionTitle("Measurements Summary");
    doc.setFontSize(10);
    const items = orders.flatMap((order) =>
      (order.items || []).map((item) => ({
        ...item,
        orderId: order.orderId,
        customerName: order.customer?.name || "Unknown",
      })),
    );
    items.slice(0, 10).forEach((item, idx) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${idx + 1}. ${item.productType || item.designType || "Item"}`, 20, y);
      y += 5;
      doc.text(`Order: ${item.orderId} | Customer: ${item.customerName}`, 22, y);
      y += 5;
    });

    try {
      const { data } = await api.get("/payments");
      doc.addPage();
      y = 20;
      addSectionTitle("Payments Summary");
      doc.setFontSize(10);
      data.slice(0, 12).forEach((payment, idx) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${idx + 1}. ${payment.order?.orderId || "N/A"} - ₹${payment.amountPaid || 0}`, 20, y);
        y += 5;
      });
    } catch (error) {
      console.error("Failed to fetch payments for combined export", error);
    }

    doc.save(`Combined_Report_${Date.now()}.pdf`);
  };

  const handleExport = async () => {
    setExportModalOpen(false);
    if (exportType === "Orders") {
      generateOrdersPDF();
    } else if (exportType === "Payments") {
      await generatePaymentsPDF();
    } else if (exportType === "Measurements") {
      generateMeasurementsPDF();
    } else {
      await generateCombinedPDF();
    }
  };

  const editOrder = (order) => {
    setEditingOrder(order);
    setFormData({
      customer: order.customer?._id || "",
      customerName: order.customer?.name || "",
      customerPhone: order.customer?.phone || "",
      orderType: order.orderType || "New stitching",
      fabricDetails: order.fabricDetails || "",
      assignedStaff: order.assignedStaff?._id || "",
      items: (order.items || []).map(normalizeSavedItem),
      pricing: {
        advancePaid: order.pricing?.advancePaid || "",
      },
    });
    setModalStep(1);
    setIsModalOpen(true);
  };

  const deleteOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await api.delete(`/orders/${id}`);
        fetchOrders();
      } catch (error) {
        console.error("Failed to delete", error);
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      "Measurement done": "bg-gray-100 text-gray-600 border-gray-200",
      Cutting: "bg-blue-50 text-blue-600 border-blue-200",
      Stitching: "bg-orange-50 text-orange-600 border-orange-200",
      Trial: "bg-purple-50 text-purple-600 border-purple-200",
      "Final adjustment": "bg-pink-50 text-pink-600 border-pink-200",
      Ready: "bg-[#E5F6E5] text-[#059669] border-[#A7F3D0]",
      Delivered: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return badges[status] || "bg-gray-50 text-gray-600 border-gray-200";
  };

  const getItemLabel = (item, index) =>
    item.productType || item.dressType || item.designType || `Item ${index + 1}`;

  const getItemPrice = (item) =>
    Number(item.totalCost ?? (item.quantity || 1) * (item.costPerPiece ?? 0) ?? 0);

  const getNormalizedItemMeasurements = (item) => {
    const normalized = expandMeasurements(item.measurements || {});
    if (item.customMeasurements?.length) {
      normalized.custom = item.customMeasurements.reduce((acc, measurement) => {
        if (!measurement?.name) return acc;
        acc[measurement.name] = measurement.value;
        return acc;
      }, {});
    }
    return normalized;
  };

  const getMeasurementFingerprint = (item) => {
    const sections = getNormalizedItemMeasurements(item);
    return Object.keys(sections)
      .sort()
      .map((section) => {
        const values = sections[section] || {};
        if (typeof values !== "object") return `${section}:${values}`;
        return `${section}:${Object.entries(values)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}:${value}`)
          .join(",")}`;
      })
      .join("|");
  };

  const ensurePageSpace = (doc, y, height, margin, needed = 36) => {
    if (y > height - margin - needed) {
      doc.addPage();
      return margin + 10;
    }
    return y;
  };

  const renderMeasurementBlock = (
    doc,
    item,
    y,
    width,
    height,
    margin,
    usedFingerprints,
  ) => {
    const fingerprint = getMeasurementFingerprint(item);
    const sections = getNormalizedItemMeasurements(item);
    const sectionNames = Object.keys(sections).filter(
      (section) => sections[section] && Object.keys(sections[section]).length,
    );
    if (!sectionNames.length) return y;

    if (usedFingerprints.has(fingerprint)) {
      doc.setFont(undefined, "italic");
      doc.setFontSize(8);
      doc.text("Same measurements as a previous item.", margin + 2, y);
      return y + 6;
    }
    usedFingerprints.add(fingerprint);

    doc.setFont(undefined, "bold");
    doc.setFontSize(9);
    doc.text("Measurements", margin + 2, y);
    y += 6;
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);

    sectionNames.forEach((section) => {
      if (y > height - margin - 30) {
        doc.addPage();
        addHeader();
        y = 36;
      }
      doc.setFont(undefined, "bold");
      doc.text(section.toUpperCase(), margin + 2, y);
      y += 5;
      doc.setFont(undefined, "normal");
      Object.entries(sections[section]).forEach(([key, value]) => {
        if (y > height - margin - 30) {
          doc.addPage();
          addHeader();
          y = 36;
        }
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .trim();
        doc.text(`${label}: ${value}`, margin + 4, y);
        y += 5;
      });
      y += 3;
    });
    return y;
  };

  const renderReferenceAndWhiteboard = (
    doc,
    item,
    y,
    width,
    height,
    margin,
  ) => {
    const referenceImages = item.referenceImages || [];
    const whiteboards = item.whiteboards || [];
    if (!referenceImages.length && !whiteboards.length) return y;

    if (y + 25 > height - margin) {
      doc.addPage();
      y = 36;
    }

    doc.setFont(undefined, "bold");
    doc.setFontSize(8);
    doc.setTextColor(13, 60, 153);
    doc.setFillColor(230, 235, 255);
    doc.rect(margin, y - 1, width - margin * 2, 5, "F");
    doc.text("REFERENCE / WHITEBOARD SKETCHES", margin + 1, y + 2);
    y += 6;

    const refBoxHeight = 18;
    const refBoxWidth = width - margin * 2;

    doc.setDrawColor(13, 60, 153);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, refBoxWidth, refBoxHeight);

    if (referenceImages.length) {
      const thumbSize = refBoxHeight - 2;
      let x = margin + 1;
      referenceImages.slice(0, 4).forEach((src) => {
        if (x + thumbSize > width - margin) return;
        if (isDataImage(src)) {
          addPdfImage(doc, src, x, y + 1, thumbSize, thumbSize);
        } else {
          doc.setDrawColor(180, 180, 180);
          doc.rect(x, y + 1, thumbSize, thumbSize);
          doc.setFontSize(5);
          doc.setTextColor(120, 120, 120);
          doc.text("IMG", x + thumbSize / 2, y + thumbSize / 2, {
            align: "center",
            baseline: "middle",
          });
        }
        x += thumbSize + 1;
      });
    }

    if (whiteboards.length) {
      y += refBoxHeight + 1;
      whiteboards.slice(0, 2).forEach((wb) => {
        if (y + 8 > height - margin) return;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(13, 60, 153);
        doc.text(`${wb.title || "Notes"}:`, margin + 1, y);
        y += 3;

        if (wb.extraDataAndNotes) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(70, 70, 70);
          const wrapped = doc.splitTextToSize(wb.extraDataAndNotes, width - margin * 2 - 2);
          doc.text(wrapped.slice(0, 1), margin + 1, y);
          y += 2.5;
        }

        const imageSources = [...(wb.imageUrls || []), ...(wb.drawingUrls || [])].slice(0, 2);
        if (imageSources.length) {
          const thumbSize = 6;
          let x = margin + 1;
          imageSources.forEach((src) => {
            if (x + thumbSize > width - margin) return;
            if (isDataImage(src)) {
              addPdfImage(doc, src, x, y, thumbSize, thumbSize);
            }
            x += thumbSize + 1;
          });
          y += thumbSize + 1;
        }
      });
    }

    return y + 2;
  };

  const getCustomerPhone = (order) =>
    order.customer?.phone || order.customerPhone || "N/A";

  const isDataImage = (src) =>
    typeof src === "string" && src.startsWith("data:image");

  const addPdfImage = (doc, src, x, y, width, height) => {
    try {
      const mime = src.match(/^data:(image\/(png|jpeg|jpg|webp));/i);
      const format = mime ? mime[2].toUpperCase() : "JPEG";
      doc.addImage(src, format === "JPG" ? "JPEG" : format, x, y, width, height);
      return true;
    } catch (error) {
      console.warn("PDF image add failed", error);
      return false;
    }
  };

  const generateOfficialBill = (order) => {
    const doc = new jsPDF("p", "mm", "a4");
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 16;

    // Header with background
    doc.setDrawColor(13, 60, 153);
    doc.setFillColor(13, 60, 153);
    doc.rect(0, 0, width, 38, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("SUJA'S FASHIONS", margin, 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(220, 230, 255);
    doc.text("Ladies Wear • Bridal Blouses • Sarees • Kids Wear", margin, 15);
    doc.text("Plot No.2, Pammal Main Road, Chennai - 600075", margin, 19);

    // Receipt header (right side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text("RECEIPT", width - margin, 10, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Order #: ${order.orderId || order._id || "N/A"}`, width - margin, 16, { align: "right" });
    doc.text(`Date: ${formatDate(order.orderDate || order.createdAt)}`, width - margin, 21, { align: "right" });
    doc.text(`Delivery: ${formatDate(order.deliveryDate)}`, width - margin, 26, { align: "right" });
    doc.text(`Phone: ${getCustomerPhone(order)}`, width - margin, 31, { align: "right" });

    y = 42;

    // Customer details box
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(245, 245, 250);
    doc.rect(margin, y, width - margin * 2, 16, "F");
    doc.setLineWidth(0.5);
    doc.rect(margin, y, width - margin * 2, 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(13, 60, 153);
    const customerName = order.customer?.name || order.customerName || "N/A";
    doc.text(`Customer: ${customerName}`, margin + 3, y + 5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Order Type: ${order.orderType || "N/A"}`, margin + 3, y + 10);
    if (order.address) {
      doc.text(`Address: ${order.address.substring(0, 50)}${order.address.length > 50 ? "..." : ""}`, margin + 3, y + 14);
    }

    y += 20;

    // Items table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(13, 60, 153);
    doc.rect(margin, y, width - margin * 2, 8, "F");
    
    const colSl = margin + 3;
    const colItem = margin + 10;
    const colQty = width - margin - 60;
    const colRate = width - margin - 38;
    const colAmt = width - margin - 3;

    doc.text("Sl.", colSl, y + 5.5);
    doc.text("Item Description", colItem, y + 5.5);
    doc.text("Qty", colQty, y + 5.5, { align: "center" });
    doc.text("Rate", colRate, y + 5.5, { align: "right" });
    doc.text("Amount", colAmt, y + 5.5, { align: "right" });
    y += 10;

    // Items list
    const items = order.items || [];
    let total = 0;
    let rowHeight = 7;

    items.forEach((item, index) => {
      const price = getItemPrice(item);
      const qty = item.quantity || 1;
      const rate = Number(item.costPerPiece || 0);
      total += price;

      if (y + rowHeight > height - margin - 35) {
        doc.addPage();
        y = margin;
        // Reprint header on new page
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(13, 60, 153);
        doc.rect(margin, y, width - margin * 2, 8, "F");
        doc.text("Sl.", colSl, y + 5.5);
        doc.text("Item Description", colItem, y + 5.5);
        doc.text("Qty", colQty, y + 5.5, { align: "center" });
        doc.text("Rate", colRate, y + 5.5, { align: "right" });
        doc.text("Amount", colAmt, y + 5.5, { align: "right" });
        y += 10;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 252);
        doc.rect(margin, y - 2, width - margin * 2, rowHeight, "F");
      }

      const itemLabel = getItemLabel(item, index).substring(0, 35);
      doc.text(`${index + 1}`, colSl, y + 2);
      doc.text(itemLabel, colItem, y + 2);
      doc.text(String(qty), colQty, y + 2, { align: "center" });
      doc.text(`₹${rate.toLocaleString()}`, colRate, y + 2, { align: "right" });
      doc.text(`₹${price.toLocaleString()}`, colAmt, y + 2, { align: "right" });
      
      y += rowHeight;
    });

    // Summary section
    y += 2;
    doc.setDrawColor(13, 60, 153);
    doc.setLineWidth(1);
    doc.line(margin, y, width - margin, y);
    y += 6;

    const advance = Number(order.pricing?.advancePaid || 0);
    const balance = Number(order.pricing?.balance ?? total - advance);

    // Summary items
    const summaryItems = [
      { label: "Total Amount", value: total, bold: false },
      { label: "Advance Paid", value: advance, bold: false },
      { label: "Pending Balance", value: balance, bold: true, color: balance > 0 ? [220, 53, 69] : [34, 139, 34] }
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    summaryItems.forEach((item) => {
      if (item.bold) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        if (item.color) {
          doc.setTextColor(...item.color);
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
      }

      doc.text(`${item.label}:`, margin + 3, y);
      doc.text(`₹${item.value.toLocaleString()}`, width - margin - 3, y, { align: "right" });
      y += 6;
    });

    y += 2;
    doc.setDrawColor(13, 60, 153);
    doc.setLineWidth(0.5);
    doc.line(margin, y, width - margin, y);
    y += 8;

    // Footer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(13, 60, 153);
    doc.text("SUJA'S FASHIONS", margin, y);
    y += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your patronage! Please preserve this receipt.", margin, y);
    doc.text("For queries, contact: +91-XXXXXXXXX", width - margin, y, { align: "right" });

    doc.save(`${order.orderId || order._id}_Official_Receipt.pdf`);
  };

  const generateCompleteReport = (order) => {
    const doc = new jsPDF("p", "mm", "a4");
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 12;
    let y = margin;

    const addHeader = () => {
      y = margin;
      doc.setFillColor(13, 60, 153);
      doc.rect(0, 0, width, 32, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("SUJA'S FASHIONS", margin, 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(220, 230, 255);
      doc.text("Ladies Wear • Bridal Blouses • Sarees • Kids Wear", margin, 14);
      doc.text("Plot No.2, Pammal Main Road, Chennai", margin, 18);
      doc.text("Ph: 044-46140870", margin, 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("MEASUREMENT BOOK", width - margin, 9, { align: "right" });

      y = 34;
    };

    const ensureSpace = (needed = 24) => {
      if (y + needed > height - margin) {
        doc.addPage();
        addHeader();
      }
    };

    const drawTableHeader = (title) => {
      doc.setFillColor(235, 241, 255);
      doc.setDrawColor(13, 60, 153);
      doc.setLineWidth(0.4);
      doc.rect(margin, y, width - margin * 2, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(13, 60, 153);
      doc.text(title, margin + 2, y + 5);
      y += 10;
    };

    const drawDetailBox = () => {
      ensureSpace(26);
      const boxHeight = 24;
      doc.setFillColor(245, 247, 255);
      doc.setDrawColor(13, 60, 153);
      doc.setLineWidth(0.4);
      doc.rect(margin, y, width - margin * 2, boxHeight, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(13, 60, 153);
      doc.text("Order Details", margin + 2, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.text(`Name: ${order.customer?.name || order.customerName || "N/A"}`, margin + 2, y + 11);
      doc.text(`B.No: ${order.orderId || order._id || "N/A"}`, width - margin - 2, y + 11, { align: "right" });
      doc.text(`Option: ${order.orderType || "N/A"}`, margin + 2, y + 16);
      doc.text(`Phone: ${getCustomerPhone(order)}`, width - margin - 2, y + 16, { align: "right" });
      doc.text(`Status: ${order.status || "Measurement done"}`, margin + 2, y + 21);
      doc.text(`Delivery: ${formatDate(order.deliveryDate)}`, width - margin - 2, y + 21, { align: "right" });
      y += boxHeight + 8;
    };

    const drawMeasurementTable = (title, measurements, fieldDefinitions = []) => {
      const rows = fieldDefinitions.length
        ? fieldDefinitions
            .map(({ key, label }) => ({ label, value: measurements?.[key] }))
            .filter(({ value }) => value !== undefined && value !== null && String(value).trim() !== "")
        : Object.entries(measurements || {}).map(([key, value]) => ({ label: formatMeasurementLabel(key), value }));
      if (!rows.length) return;

      ensureSpace(14 + rows.length * 6 + 12);
      drawTableHeader(title);

      const tableWidth = width - margin * 2;
      const col1 = margin + 2;
      const col2 = margin + tableWidth * 0.55;
      const col3 = width - margin - 4;
      const rowHeight = 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("S.No", col1, y + 4);
      doc.text("Measurement", col2, y + 4);
      doc.text("Value", col3, y + 4, { align: "right" });
      y += rowHeight;

      doc.setDrawColor(210, 210, 220);
      doc.setLineWidth(0.2);
      doc.line(margin, y - 1, width - margin, y - 1);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      rows.forEach((row, idx) => {
        if (y + rowHeight > height - margin) {
          doc.addPage();
          addHeader();
          drawTableHeader(title);
          y += rowHeight;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(margin, y - 1, tableWidth, rowHeight + 1, "F");
        }
        doc.setTextColor(40, 40, 40);
        doc.text(String(idx + 1), col1, y + 4);
        doc.text(row.label, col2, y + 4);
        doc.text(String(row.value), col3, y + 4, { align: "right" });
        y += rowHeight;
      });

      y += 6;
    };

    const drawOrderDetails = () => {
      drawDetailBox();
    };

    const drawItemMeasurements = (item, index) => {
      ensureSpace(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(13, 60, 153);
      doc.text(`Item ${index + 1}: ${getItemLabel(item, index)}`, margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 70);
      doc.text(
        `Qty: ${item.quantity || 1}  •  Delivery: ${formatDate(item.deliveryDate)}  •  Status: ${item.itemStatus || "Measurement done"}`,
        margin,
        y,
      );
      y += 7;

      const sections = getNormalizedItemMeasurements(item);
      const sectionTitles = {
        blouse: "BLOUSE / SALWAR / FROCK",
        top: "TOP",
        pant: "PANT",
        skirt: "SKIRT",
        custom: "CUSTOM MEASUREMENTS",
      };

      ["blouse", "top", "pant", "skirt", "custom"].forEach((section) => {
        const measurements = sections[section] || {};
        const definitions = measurementSectionDefinitions[section] || [];
        const hasMeasurements = definitions.some(
          ({ key }) => measurements?.[key] !== undefined && measurements?.[key] !== null && String(measurements[key]).trim() !== "",
        );
        if (!hasMeasurements) return;
        drawMeasurementTable(sectionTitles[section], measurements, definitions);
      });
    };

    addHeader();
    drawOrderDetails();

    const items = order.items || [];
    items.forEach((item, index) => {
      drawItemMeasurements(item, index);
      y = renderReferenceAndWhiteboard(doc, item, y, width, height, margin);
      y += 8;
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(`Page ${page} of ${pageCount}`, width / 2, height - 8, { align: "center" });
    }

    doc.save(`${order.orderId || order._id}_Complete_Report.pdf`);
  };
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      (o.orderId || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.customer?.name || "").toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (activeTab === "All Products") return true;
    if (activeTab === "Current" && o.status !== "Delivered") return true;
    if (activeTab === "Delayed") {
      const days = Math.ceil(
        (new Date(o.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24),
      );
      return days < 0 && o.status !== "Delivered";
    }
    // simple matching for other tabs conceptually
    return o.status === activeTab;
  });

  const tabs = [
    "All Products",
    "Current",
    "Delayed",
    "Alteration",
    "Out for Delivery",
  ];

  const getItemStageForDate = (item, selectedDate) => {
    if (!item?.aiSchedule) return "No schedule";
    const parse = (value) => {
      if (!value) return null;
      return typeof value === "string" ? new Date(value) : new Date(value);
    };
    const target = parse(selectedDate);
    if (!target || isNaN(target)) return "Invalid date";
    const cuttingEnd = parse(item.aiSchedule?.cutting?.endDate);
    const stitchingEnd = parse(item.aiSchedule?.stitching?.endDate);
    const trialEnd = parse(item.aiSchedule?.trial?.endDate);
    const finalEnd = parse(item.aiSchedule?.finalWork?.endDate);
    if (cuttingEnd && target <= cuttingEnd) return "Cutting";
    if (stitchingEnd && target <= stitchingEnd) return "Stitching";
    if (trialEnd && target <= trialEnd) return "Trial";
    if (finalEnd && target <= finalEnd) return "Final adjustment";
    return item.itemStatus === "Delivered" ? "Delivered" : "Ready";
  };

    const renderScheduleModal = (order) => {
      const selectedDate = new Date().toISOString().split("T")[0];

      return (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 relative max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800">Item Timeline Generator</h2>
              <button
                onClick={() => setScheduleData(null)}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded"
              >
                Close
              </button>
            </div>

            <div className="text-sm text-gray-500 mb-4">Generate a timeline for each item independently. Boutique orders should not force a single order-level schedule.</div>

            <div className="space-y-4">
              {(order.items || []).map((item, idx) => {
                const itemStatus = getItemStageForDate(item, selectedDate);
                const schedule = item.aiSchedule || {};
                const deliveryDate = formatDate(item.deliveryDate);
                const cutting = formatDate(schedule.cutting?.endDate);
                const stitching = formatDate(schedule.stitching?.endDate);
                const trial = formatDate(schedule.trial?.endDate);
                const finalWork = formatDate(schedule.finalWork?.endDate);

                return (
                  <div key={idx} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{item.productType || `Item ${idx + 1}`}</div>
                        <div className="text-sm text-gray-500">Delivery: {deliveryDate}</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">{itemStatus}</div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Current Stage</div>
                        <div className="text-sm font-semibold text-gray-800">{itemStatus}</div>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Timeline</div>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="flex justify-between"><span>Cutting</span><span>{cutting}</span></div>
                          <div className="flex justify-between"><span>Stitching</span><span>{stitching}</span></div>
                          <div className="flex justify-between"><span>Trial</span><span>{trial}</span></div>
                          <div className="flex justify-between"><span>Final</span><span>{finalWork}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => applyOrderItemSchedule(order, idx)}
                        className="rounded-lg border border-[#6D28D9] bg-white px-4 py-2 text-sm font-semibold text-[#6D28D9] hover:bg-[#EEF2FF]"
                      >
                        Generate Timeline
                      </button>
                      <button
                        type="button"
                        onClick={() => editOrderItemSchedule(order, idx)}
                        className="rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                      >
                        Edit Schedule
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

  return (
    <div className="relative flex flex-col h-full bg-[#FDFDFD]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-100 pb-4 mb-6">
        <div className="flex gap-6 overflow-x-auto custom-scrollbar w-full md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 whitespace-nowrap text-sm font-semibold transition-colors relative ${activeTab === tab ? "text-[#6D28D9]" : "text-gray-500 hover:text-gray-800"}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-1 focus:ring-[#6D28D9] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
          </div>
          <button
            onClick={() => setExportModalOpen(true)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors hover:bg-gray-50 shadow-sm"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => {
              setEditingOrder(null);
              setFormData(initialForm);
              setModalStep(1);
              setIsModalOpen(true);
            }}
            className="bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm ml-2 tracking-wide"
          >
            Configure Order
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#FAF9FF] text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Client Details</th>
                <th className="px-6 py-4 font-semibold">Task Status</th>
                <th className="px-6 py-4 font-semibold">Delivery Date</th>
                <th className="px-6 py-4 font-semibold">Days Left</th>
                <th className="px-6 py-4 font-semibold flex items-center justify-between">
                  Actions
                  <div className="flex items-center gap-1 text-gray-400">
                    <span className="bg-white border border-gray-200 rounded px-2 tracking-normal text-gray-600 text-[10px]">
                      ■ Ongoing
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const days = Math.ceil(
                  (new Date(o.deliveryDate) - new Date()) /
                    (1000 * 60 * 60 * 24),
                );
                const isOverdue = days < 0;
                return (
                  <tr
                    key={o._id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">
                          {o.orderId || o._id.slice(-5)}
                        </span>
                        <span className="text-xs text-gray-400">{o.items?.length || 1} item{o.items?.length === 1 ? "" : "s"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[#6D28D9] font-medium text-sm hover:underline cursor-pointer">
                          {o.customer?.name || "Unknown"} - {((o.items?.[0]?.dressType || o.dressType || "N/A") + "").split(" ")[0]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-widest inline-block ${getStatusBadge(o.status)}`}
                      >
                        {o.status.split(" ")[0]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium text-sm">
                      {new Date(o.deliveryDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {o.status === "Delivered" ? (
                          <span className="text-sm font-medium text-green-600">
                            ✓ Completed
                          </span>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-gray-700">
                              {Math.abs(days)} day{Math.abs(days) !== 1 && "s"}
                            </span>
                            {isOverdue && (
                              <span className="bg-[#FEF2F2] text-[#EF4444] border border-[#FCA5A5] px-1.5 py-0.5 rounded text-[10px] font-bold uppercase hidden md:inline-block">
                                Overdue
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <div className="flex gap-3 flex-wrap items-center">
                        {/* PDF Icons - Always visible */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateOfficialBill(o);
                          }}
                          className="hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50"
                          title="Download Official Bill"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateCompleteReport(o);
                          }}
                          className="hover:text-purple-600 transition-colors p-1 rounded hover:bg-purple-50"
                          title="Download Complete Report"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Order Management - Only for non-delivered */}
                        {o.status !== "Delivered" && (
                          <>
                            {user?.role === "Owner" && (
                              <button
                                onClick={() => setPaymentOrder(o)}
                                className="hover:text-emerald-500 transition-colors p-1 rounded hover:bg-emerald-50"
                                title="Record Payment"
                              >
                                <IndianRupee className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setScheduleData(o);
                              }}
                              className="hover:text-[#6D28D9] transition-colors p-1 rounded hover:bg-purple-50"
                              title="Item Timeline"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Edit & Delete */}
                        <button
                          onClick={() => editOrder(o)}
                          className="hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-50"
                          title="Edit Order"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user?.role === "Owner" && (
                          <button
                            onClick={() => deleteOrder(o._id)}
                            className="hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-400">
                    No products match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination mock */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-white mt-auto">
          <span>Total {filteredOrders.length} Items</span>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center bg-[#6D28D9] text-white font-medium shadow-sm">
              1
            </button>
            <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
              <ChevronRight className="w-4 h-4" />
            </button>
            <select className="ml-3 outline-none bg-transparent cursor-pointer font-medium text-gray-600 border border-gray-200 rounded px-1 py-0.5">
              <option>10 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Order Stepper Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div
  className="bg-[#fcfcfc] rounded-2xl shadow-xl w-full max-w-5xl flex border border-gray-200 overflow-hidden"
  style={{
    height: "90vh",
    maxHeight: "90vh",
  }}
>
            {/* Left side stepper indicators */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-8 flex flex-col justify-center gap-10">
              <h2 className="text-xl font-bold text-gray-800 absolute top-8 left-8">
                Create new order
              </h2>

              <div className="flex gap-4 items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${modalStep >= 1 ? "bg-[#2563EB] text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  1
                </div>
                <span
                  className={`font-semibold text-sm ${modalStep >= 1 ? "text-gray-800" : "text-gray-400"}`}
                >
                  Client Details
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${modalStep >= 2 ? "bg-[#2563EB] text-white" : "bg-gray-200 text-gray-500"}`}
                >
                  2
                </div>
                <span
                  className={`font-semibold text-sm ${modalStep >= 2 ? "text-gray-800" : "text-gray-400"}`}
                >
                  Product Details
                </span>
              </div>
              {user?.role === "Owner" && (
                <div className="flex gap-4 items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${modalStep >= 3 ? "bg-[#2563EB] text-white" : "bg-gray-200 text-gray-500"}`}
                  >
                    3
                  </div>
                  <span
                    className={`font-semibold text-sm ${modalStep >= 3 ? "text-gray-800" : "text-gray-400"}`}
                  >
                    Payment Details
                  </span>
                </div>
              )}
            </div>

            {/* Right side form content */}
            <div className="flex-1 flex flex-col bg-white relative min-h-0">
              <div className="flex justify-end p-4 pb-0">
                <button
                  onClick={closeModal}
                  type="button"
                  className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-2 pb-36">
                <form
                  onSubmit={handleSubmit}
                  className="w-full max-w-3xl mx-auto"
                >
                  {/* STEP 1: Client Details */}
                  {modalStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          * Mobile Number
                        </label>
                        <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                          <div className="bg-gray-50 px-3 py-2 border-r border-gray-300 flex items-center gap-2">
                            <span className="text-sm font-medium">🇮🇳</span>{" "}
                            <span className="text-sm font-medium text-gray-600">
                              +91
                            </span>
                          </div>
                          <input
                            required
                            type="text"
                            name="customerPhone"
                            value={formData.customerPhone}
                            onChange={handleInputChange}
                            className="flex-1 px-3 py-2 text-sm focus:outline-none"
                            placeholder="9876543210"
                            disabled={!!editingOrder}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Please enter a valid 10-digit phone number.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          * Name
                        </label>
                        <input
                          required
                          type="text"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                          placeholder="Client name"
                          disabled={!!editingOrder}
                        />
                      </div>

                                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Address
                        </label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-h-[80px]"
                          placeholder="Client address..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Order type
                        </label>
                        <select
                          name="orderType"
                          value={formData.orderType}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                        >
                          <option value="New stitching">New stitching</option>
                          <option value="Alteration">Alteration</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Product Details */}
                  {modalStep === 2 && (
                    <div className="space-y-8">
                      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">Product Details</h3>
                            <p className="text-sm text-gray-500">Add one item at a time. Use the measurement sheet that matches your measurement book.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAddItemOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" /> Add Item
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">
                          Each item has its own delivery date, cost, status, AI schedule, and whiteboard.
                          The order overall will use the latest item delivery date as a summary due date.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Fabric / Notes
                        </label>
                        <textarea
                          name="fabricDetails"
                          value={formData.fabricDetails}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow min-h-[80px]"
                          placeholder="Fabric details, measurements..."
                        />
                      </div>

                      <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div>
                            <h4 className="text-base font-semibold text-gray-800">Order items</h4>
                            <p className="text-sm text-gray-500">Every item has a product type and cost. Measurements are optional.</p>
                          </div>
                          <div className="text-sm font-semibold text-gray-700">Total ₹{getTotalAmount()}</div>
                        </div>

                        {formData.items.length === 0 ? (
                          <div className="rounded-3xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                            No items added yet. Click Add Item to start building this order.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {formData.items.map((item, index) => (
                              <div key={index} className="rounded-3xl border border-gray-200 bg-white p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">Item #{index + 1}: {item.productType || "—"}</div>
                                    {formData.orderType !== "Alteration" && (
                                      <div className="text-sm text-gray-500">{item.designType || "No design type"}</div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Qty: {item.quantity || 1}</span>
                                    {formData.orderType !== "Alteration" && (
                                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">₹{Number(item.costPerPiece || 0)} each</span>
                                    )}
                                    <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#4338CA]">Total ₹{Number(item.totalCost || 0)}</span>
                                  </div>
                                </div>

                                {formData.orderType === "Alteration" ? (
                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Delivery Date</div>
                                      <div className="text-sm text-gray-700 font-medium">{formatDate(item.deliveryDate)}</div>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Total Amount</div>
                                      <div className="text-sm text-gray-700 font-medium">₹{Number(item.totalCost || 0)}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Delivery Date</div>
                                        <div className="text-sm text-gray-700 font-medium">{formatDate(item.deliveryDate)}</div>
                                      </div>
                                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Status</div>
                                        <div className="text-sm text-gray-700 font-medium">{item.itemStatus || "Measurement done"}</div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Options</div>
                                        <div className="flex flex-wrap gap-2">
                                          {(item.options || []).length > 0 ? (
                                            (item.options || []).map((opt) => (
                                              <span key={opt} className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-medium text-[#4338CA]">{opt}</span>
                                            ))
                                          ) : (
                                            <span className="text-xs text-gray-400">No options</span>
                                          )}
                                          {(item.customOptions || []).map((opt, idx) => (
                                            <span key={`${opt}-${idx}`} className="rounded-full bg-[#F3E8FF] px-3 py-1 text-xs font-medium text-[#6D28D9]">{opt}</span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Custom measurements</div>
                                        {(item.customMeasurements || []).length > 0 ? (
                                          <div className="space-y-2 text-sm text-gray-700">
                                            {(item.customMeasurements || []).map((row, idx) => (
                                              <div key={idx} className="flex items-center justify-between gap-3">
                                                <span>{row.section ? `${row.section}: ${row.name}` : row.name || "Unnamed"}</span>
                                                <span className="font-medium">{row.value || "—"}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-400">No custom measurements</div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-wide text-gray-500">
                                          <span>AI Schedule</span>
                                          <button
                                            type="button"
                                            onClick={() => applyItemSchedule(index)}
                                            className="text-[11px] font-semibold text-[#3730A3] hover:underline"
                                          >
                                            Generate
                                          </button>
                                        </div>
                                        {item.aiSchedule?.finalWork?.endDate ? (
                                          <div className="space-y-1 text-sm text-gray-700">
                                            <div>Cutting by {formatDate(item.aiSchedule.cutting?.endDate)}</div>
                                            <div>Stitching by {formatDate(item.aiSchedule.stitching?.endDate)}</div>
                                            <div>Trial by {formatDate(item.aiSchedule.trial?.endDate)}</div>
                                            <div>Final by {formatDate(item.aiSchedule.finalWork?.endDate)}</div>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-400">No schedule generated yet</div>
                                        )}
                                      </div>
                                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Whiteboards</div>
                                        <div className="text-sm text-gray-700">
                                          {item.whiteboards?.length ? `${item.whiteboards.length} board(s)` : "1 board included"}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openItemWhiteboard(item, index)}
                                    className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                                  >
                                    <PenTool className="w-3.5 h-3.5 inline mr-1" />
                                    Whiteboard
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleItemEdit(index)}
                                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                                  >
                                    Edit Item
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleItemRemove(index)}
                                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Remove Item
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Payment Details (Owner Only) */}
                  {modalStep === 3 && user?.role === "Owner" && (
                    <div className="space-y-6">
                      <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs uppercase tracking-wide text-gray-500">Total Amount</span>
                          <span className="text-lg font-semibold text-gray-900">₹{getTotalAmount()}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <span className="text-xs uppercase tracking-wide text-gray-500">Balance Due</span>
                          <span className="text-lg font-semibold text-gray-900">₹{getBalance()}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Advance Paid (₹)
                        </label>
                        <input
                          type="number"
                          name="advancePaid"
                          value={formData.pricing.advancePaid}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                          placeholder="ex: 2000"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Assign to Staff (Optional)
                        </label>
                        <select
                          name="assignedStaff"
                          value={formData.assignedStaff}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white text-gray-700"
                        >
                          <option value="">-- Unassigned --</option>
                          {staffList.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="sticky bottom-0 bg-white pt-4 pb-2 flex justify-between border-t border-gray-100 mt-8">
                    {modalStep > 1 ? (
                      <button
                        type="button"
                        onClick={() => setModalStep(modalStep - 1)}
                        className="px-6 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                      >
                        Back
                      </button>
                    ) : (
                      <div></div>
                    )}
                    <button
                      type="submit"
                      className="px-8 py-2.5 rounded-lg font-bold bg-[#2563EB] hover:bg-blue-700 text-white shadow-md transition-colors text-sm tracking-wide"
                    >
                      {modalStep < (user?.role === "Owner" ? 3 : 2)
                        ? "Next"
                        : "Save Order"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddItemOpen && (
        <AddItemModal
          existingItems={formData.items}
          previousMeasurements={customerHistoryItems}
          initialItem={editingItemIndex !== null ? formData.items[editingItemIndex] : undefined}
          onClose={closeAddItem}
          onSave={saveNewItem}
          orderType={formData.orderType}
        />
      )}

      {/* Schedule Modal (Unchanged styling for now, just functional) */}
      {scheduleData && renderScheduleModal(scheduleData)}

      {/* Payment Modal (Keep simple) */}
      {paymentOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setPaymentOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Record Payment
            </h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="text-sm font-medium text-gray-600">
                Balance:{" "}
                <span className="text-red-500 font-bold">
                  ₹{paymentOrder.pricing?.balance}
                </span>
              </div>
              <input
                required
                type="number"
                value={paymentForm.amountPaid}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amountPaid: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                placeholder="Amount"
              />
              <select
                value={paymentForm.method}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, method: e.target.value, transactionId: e.target.value === "Cash" ? "" : paymentForm.transactionId })
                }
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
              >
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Online</option>
              </select>
              {(paymentForm.method === "UPI" ||
                paymentForm.method === "Card" ||
                paymentForm.method === "Online") && (
                <input
                  type="text"
                  value={paymentForm.transactionId}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, transactionId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                  placeholder="Transaction ID (optional)"
                />
              )}
              <button
                type="submit"
                className="w-full bg-[#6D28D9] text-white py-2.5 rounded-lg font-bold text-sm"
              >
                Save Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setExportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Export PDF</h2>
            <p className="text-sm text-gray-500 mb-5">
              Choose the report section you want to export. You can generate orders, payments, measurements, or a combined report.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 mb-6">
              {['Orders', 'Payments', 'Measurements', 'Combined'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setExportType(type)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    exportType === type
                      ? 'border-[#6D28D9] bg-[#eff6ff] text-[#1d4ed8]'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#6D28D9] hover:bg-[#f8fafc]'
                  }`}
                >
                  <div className="font-semibold">{type}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {type === 'Orders' && 'Export the current orders list.'}
                    {type === 'Payments' && 'Export all recorded payments.'}
                    {type === 'Measurements' && 'Export item measurement details.'}
                    {type === 'Combined' && 'Export a complete combined report.'}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-5 py-2 rounded-lg bg-[#2563EB] text-white font-semibold hover:bg-blue-700"
              >
                Export {exportType}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Whiteboard Modal */}
      {activeItemWhiteboard && (
        <ItemWhiteboardModal
          item={activeItemWhiteboard.item}
          itemIndex={activeItemWhiteboard.index}
          order={editingOrder || { orderId: "Draft" }}
          onClose={() => setActiveItemWhiteboard(null)}
          onSave={saveItemWhiteboards}
        />
      )}

      {/* Schedule Edit Modal */}
      {editingScheduleData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Edit Item Schedule</h2>
              <button
                onClick={() => {
                  setEditingScheduleData(null);
                  setScheduleEditForm({
                    cuttingEndDate: "",
                    stitchingEndDate: "",
                    trialEndDate: "",
                    finalWorkEndDate: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">Update the item timeline with individual milestone dates. Leave fields blank to keep them unchanged.</p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cutting End Date</label>
                <input
                  type="date"
                  value={scheduleEditForm.cuttingEndDate}
                  onChange={(e) => setScheduleEditForm({ ...scheduleEditForm, cuttingEndDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stitching End Date</label>
                <input
                  type="date"
                  value={scheduleEditForm.stitchingEndDate}
                  onChange={(e) => setScheduleEditForm({ ...scheduleEditForm, stitchingEndDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trial End Date</label>
                <input
                  type="date"
                  value={scheduleEditForm.trialEndDate}
                  onChange={(e) => setScheduleEditForm({ ...scheduleEditForm, trialEndDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Final Work End Date</label>
                <input
                  type="date"
                  value={scheduleEditForm.finalWorkEndDate}
                  onChange={(e) => setScheduleEditForm({ ...scheduleEditForm, finalWorkEndDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingScheduleData(null);
                  setScheduleEditForm({
                    cuttingEndDate: "",
                    stitchingEndDate: "",
                    trialEndDate: "",
                    finalWorkEndDate: "",
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEditedSchedule}
                className="flex-1 px-4 py-2 bg-[#6D28D9] text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
