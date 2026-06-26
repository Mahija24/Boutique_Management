import { useState } from "react";
import { X, Plus, Check } from "lucide-react";

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

const optionChoices = [
  "Front Open",
  "Back Open",
  "Normal Cut",
  "Princess Cut",
  "Katori Cut",
  "Cross Cut",
  "Other",
];

const defaultItem = {
  productType: "",
  designType: "",
  quantity: 1,
  costPerPiece: "",
  totalCost: 0,
  deliveryDate: "",
  measurements: {
    blouse: {},
    top: {},
    pant: {},
    skirt: {},
  },
  options: [],
  customOptions: [],
  customMeasurements: [],
  notes: "",
  whiteboards: [
    {
      id: "board-1",
      title: "Board 1",
      extraDataAndNotes: "",
      imageUrls: [],
      canvasPaths: [],
      audioNotes: [],
    },
  ],
  sameMeasurementFrom: null,
};

const normalizeItem = (base) => ({
  ...defaultItem,
  ...base,
  quantity: base?.quantity ?? defaultItem.quantity,
  costPerPiece: base?.costPerPiece ?? defaultItem.costPerPiece,
  totalCost: base?.totalCost ?? defaultItem.totalCost,
  deliveryDate: base?.deliveryDate ?? defaultItem.deliveryDate,
  measurements: {
    ...defaultItem.measurements,
    ...(base?.measurements || {}),
  },
  options: base?.options || defaultItem.options,
  customOptions: base?.customOptions || defaultItem.customOptions,
  customMeasurements: base?.customMeasurements || defaultItem.customMeasurements,
  notes: base?.notes || defaultItem.notes,
  whiteboards: base?.whiteboards || defaultItem.whiteboards,
  sameMeasurementFrom: base?.sameMeasurementFrom || defaultItem.sameMeasurementFrom,
});

const AddItemModal = ({
  existingItems = [],
  previousMeasurements = [],
  initialItem,
  onClose,
  onSave,
  orderType = "New stitching",
}) => {
  const isEditing = Boolean(initialItem);
  const [step, setStep] = useState(
    orderType === "Alteration"
      ? "form"
      : isEditing
      ? "form"
      : existingItems.length > 0 || previousMeasurements.length > 0
      ? "choice"
      : "form",
  );
  const [copyMode, setCopyMode] = useState("same");
  const [newCustomOption, setNewCustomOption] = useState("");
  const [item, setItem] = useState(normalizeItem(initialItem));

  const updateField = (field, value) => {
    setItem((current) => ({ ...current, [field]: value }));
  };

  const updateMeasurement = (section, key, value) => {
    setItem((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        [section]: {
          ...current.measurements[section],
          [key]: value,
        },
      },
    }));
  };

  const toggleOption = (option) => {
    setItem((current) => {
      const has = current.options.includes(option);
      return {
        ...current,
        options: has
          ? current.options.filter((opt) => opt !== option)
          : [...current.options, option],
      };
    });
  };

  const addCustomOption = (optionName) => {
    if (optionName.trim()) {
      setItem((current) => ({
        ...current,
        customOptions: [...current.customOptions, optionName],
      }));
      setNewCustomOption("");
    }
  };

  const removeCustomOption = (index) => {
    setItem((current) => ({
      ...current,
      customOptions: current.customOptions.filter((_, i) => i !== index),
    }));
  };

  const addCustomMeasurement = (section) => {
    setItem((current) => ({
      ...current,
      customMeasurements: [
        ...current.customMeasurements,
        { section, name: "", value: "" },
      ],
    }));
  };

  const updateCustomMeasurement = (index, key, value) => {
    setItem((current) => {
      const customMeasurements = [...current.customMeasurements];
      customMeasurements[index] = {
        ...customMeasurements[index],
        [key]: value,
      };
      return { ...current, customMeasurements };
    });
  };

  const removeCustomMeasurement = (index) => {
    setItem((current) => ({
      ...current,
      customMeasurements: current.customMeasurements.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!item.productType.trim()) {
      alert("Product Type is required.");
      return;
    }

    if (!item.deliveryDate) {
      alert("Delivery Date is required for each item.");
      return;
    }

    if (orderType === "Alteration") {
      if (!item.totalCost || Number(item.totalCost) <= 0) {
        alert("Please enter a valid total amount for alteration.");
        return;
      }
    } else {
      if (!item.costPerPiece && Number(item.costPerPiece) !== 0) {
        alert("Please enter cost per piece.");
        return;
      }
    }

    const quantity = item.quantity ? Number(item.quantity) : 1;
    const normalizedItem = {
      ...item,
      quantity,
      costPerPiece:
        orderType === "Alteration"
          ? item.totalCost
            ? Number(item.totalCost) / (quantity || 1)
            : 0
          : item.costPerPiece
          ? Number(item.costPerPiece)
          : 0,
      totalCost:
        orderType === "Alteration"
          ? Number(item.totalCost || 0)
          : (item.costPerPiece ? Number(item.costPerPiece) : 0) * quantity,
    };
    onSave(normalizedItem);
    onClose();
  };

  const handleSameMeasurements = () => {
    const source =
      copyMode === "same"
        ? existingItems[0]
        : previousMeasurements[0] || existingItems[0];
    if (!source) {
      setStep("form");
      return;
    }

    const copied = {
      ...defaultItem,
      measurements: source.measurements || defaultItem.measurements,
      customMeasurements: source.customMeasurements || [],
      sameMeasurementFrom:
        copyMode === "same" ? 0 : `customer-history-${source.orderId || 0}`,
    };
    setItem(copied);
    setStep("form");
  };

  const heading = step === "choice" ? "Same Measurements?" : isEditing ? "Edit Item" : "Add Item";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{heading}</h2>
            <p className="text-sm text-gray-500">
              {step === "choice"
                ? "Choose whether the new item should reuse the previous measurements or start fresh."
                : "Enter product details, measurements, options and cost exactly like the paper book."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {step === "choice" ? (
            <div className="space-y-6">
              <div className="space-y-3 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white cursor-pointer">
                  <input
                    type="radio"
                    name="copyMode"
                    value="same"
                    checked={copyMode === "same"}
                    onChange={() => setCopyMode("same")}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Reuse current order measurements</p>
                    <p className="text-sm text-gray-500">Copy measurement values from the first item in this order.</p>
                  </div>
                </label>
                {previousMeasurements.length > 0 && (
                  <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white cursor-pointer">
                    <input
                      type="radio"
                      name="copyMode"
                      value="customerHistory"
                      checked={copyMode === "customerHistory"}
                      onChange={() => setCopyMode("customerHistory")}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">Reuse customer history</p>
                      <p className="text-sm text-gray-500">Use previous measurements from this customer’s past order.</p>
                    </div>
                  </label>
                )}
                <label className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white cursor-pointer">
                  <input
                    type="radio"
                    name="copyMode"
                    value="different"
                    checked={copyMode === "different"}
                    onChange={() => setCopyMode("different")}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">Different Measurements</p>
                    <p className="text-sm text-gray-500">Open a new measurement sheet for a new item.</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => (copyMode === "same" ? handleSameMeasurements() : setStep("form"))}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Check className="w-4 h-4" /> Proceed
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Product Type *
                  </label>
                  <input
                    type="text"
                    value={item.productType}
                    onChange={(e) => updateField("productType", e.target.value)}
                    className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Blouse, Top, Frock, Lehenga, Chudi, Pattu Pavadai, Jacket, Kids Frock, Anything"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Design Type (Optional)
                  </label>
                  {orderType !== "Alteration" ? (
                    <input
                      type="text"
                      value={item.designType}
                      onChange={(e) => updateField("designType", e.target.value)}
                      className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Aari Work, Maggam Work, Simple, Designer, Bridal"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">(hidden for Alteration)</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateField("quantity", parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
                {orderType === "Alteration" ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Total Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.totalCost}
                      onChange={(e) => updateField("totalCost", e.target.value)}
                      className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Total amount for alteration"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Cost Per Piece (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.costPerPiece}
                        onChange={(e) => updateField("costPerPiece", e.target.value)}
                        className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Total Cost
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`₹${(item.quantity * (Number(item.costPerPiece) || 0)).toFixed(0)}`}
                        className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm bg-gray-50 text-gray-600"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  value={item.deliveryDate}
                  onChange={(e) => updateField("deliveryDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {orderType !== "Alteration" && (
                <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_1fr]">
                    <div className="font-semibold text-sm text-gray-700">Measurements</div>
                    <div className="font-semibold text-sm text-gray-700">Blouse</div>
                    <div className="font-semibold text-sm text-gray-700">Top</div>
                  </div>
                  <div className="divide-y divide-gray-200 mt-4">
                    {blouseTopMeasurements.map((field) => (
                      <div key={field.key} className="grid grid-cols-1 gap-4 py-3 lg:grid-cols-[200px_1fr_1fr]">
                        <div className="text-sm text-gray-700">{field.label}</div>
                        <input
                          type="text"
                          value={item.measurements.blouse[field.key] || ""}
                          onChange={(e) => updateMeasurement("blouse", field.key, e.target.value)}
                          className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Value"
                        />
                        <input
                          type="text"
                          value={item.measurements.top[field.key] || ""}
                          onChange={(e) => updateMeasurement("top", field.key, e.target.value)}
                          className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Value"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {orderType !== "Alteration" && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-gray-200 bg-white p-5">
                    <div className="font-semibold text-sm text-gray-700 mb-4">Options</div>
                    <div className="grid grid-cols-2 gap-3">
                      {optionChoices.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleOption(opt)}
                          className={`rounded-2xl border px-3 py-2 text-sm text-left transition ${item.options.includes(opt)
                            ? "border-[#7C3AED] bg-[#EEF2FF] text-[#4338CA]"
                            : "border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {item.options.includes("Other") && (
                      <div className="mt-4 space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCustomOption}
                            onChange={(e) => setNewCustomOption(e.target.value)}
                            placeholder="Enter custom option name"
                            className="flex-1 border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => addCustomOption(newCustomOption)}
                            className="bg-blue-500 text-white px-3 py-2 rounded-2xl text-sm hover:bg-blue-600"
                          >
                            Add
                          </button>
                        </div>
                        {item.customOptions.length > 0 && (
                          <div className="space-y-2">
                            {item.customOptions.map((opt, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                <span className="text-sm text-blue-900">{opt}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCustomOption(idx)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-sm text-gray-700">Pant Section</div>
                      <button
                        type="button"
                        onClick={() => addCustomMeasurement("pant")}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Plus className="w-3 h-3" /> Add Other Measurement
                      </button>
                    </div>
                    <div className="space-y-3">
                      {pantMeasurements.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            value={item.measurements.pant[field.key] || ""}
                            onChange={(e) => updateMeasurement("pant", field.key, e.target.value)}
                            className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Value"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {orderType !== "Alteration" && (
                <>
                  <div className="rounded-3xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-sm text-gray-700">Skirt Section</div>
                      <button
                        type="button"
                        onClick={() => addCustomMeasurement("skirt")}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Plus className="w-3 h-3" /> Add Other Measurement
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {skirtMeasurements.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">
                            {field.label}
                          </label>
                          <input
                            type="text"
                            value={item.measurements.skirt[field.key] || ""}
                            onChange={(e) => updateMeasurement("skirt", field.key, e.target.value)}
                            className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Value"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-sm text-gray-700">Other Measurements</p>
                        <p className="text-xs text-gray-500">Add any custom measurement name and value.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addCustomMeasurement("other")}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Other Measurement
                      </button>
                    </div>
                    <div className="space-y-3">
                      {item.customMeasurements.map((row, index) => (
                        <div key={index} className="space-y-2 rounded-2xl border border-gray-200 p-3">
                          {row.section && (
                            <div className="text-xs uppercase tracking-wide text-gray-500">Section: {row.section}</div>
                          )}
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr_auto]">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateCustomMeasurement(index, "name", e.target.value)}
                              className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Measurement Name"
                            />
                            <input
                              type="text"
                              value={row.value}
                              onChange={(e) => updateCustomMeasurement(index, "value", e.target.value)}
                              className="w-full border border-gray-300 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Value"
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomMeasurement(index)}
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-red-600 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Extra Notes
                </label>
                <textarea
                  value={item.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className="w-full min-h-[120px] resize-none border border-gray-300 rounded-3xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Deep neck, use gold piping, attach tassels, keep loose fitting, etc."
                />
              </div>

              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Check className="w-4 h-4" /> Save Item
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddItemModal;
