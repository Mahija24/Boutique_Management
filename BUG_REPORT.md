# Boutique Management Project - Bug Report

## Frontend Issues

### 1. **Orders Page - Missing Button Handlers**

#### Line 8

**Issue:** Test toast notification that always displays on page load

```javascript
toast.success("Working!");
```

**Status:** Should be removed or moved to a proper test environment

---

#### Line 208

**Issue:** "More" button without onClick handler

```javascript
<button className="pb-4 px-1 text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1">
  More <span className="text-[10px] ml-0.5">▼</span>
</button>
```

**Expected:** Should either be removed or have a dropdown menu handler to show additional order tabs

---

#### Lines 214-217

**Issue:** "Filter" and "Columns" buttons without onClick handlers

```javascript
<button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
   <Filter className="w-4 h-4" /> Filter
</button>
<button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
   <Columns className="w-4 h-4" /> Columns
</button>
```

**Expected:** Should open modal dialogs for filtering and selecting visible columns

---

#### Lines 328-330

**Issue:** Pagination buttons without onClick handlers

```javascript
<button className="p-1 hover:bg-gray-100 rounded text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
<button className="w-6 h-6 rounded flex items-center justify-center bg-[#6D28D9] text-white font-medium shadow-sm">1</button>
<button className="p-1 hover:bg-gray-100 rounded text-gray-400"><ChevronRight className="w-4 h-4" /></button>
```

**Expected:** Should implement pagination logic

---

### 2. **Calendar System - Missing Button Handlers**

#### Line 80

**Issue:** "Add Event" button without onClick handler

```javascript
<button className="bg-[#6D28D9] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm font-bold text-sm">
  <CalendarIcon className="w-4 h-4" /> Add Event
</button>
```

**Expected:** Should open a modal to create new calendar event

---

#### Line 120

**Issue:** "Check" button (CheckCircle2) in calendar events without onClick handler

```javascript
<button className="bg-white border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-300 p-2 rounded-full transition-colors">
  <CheckCircle2 className="w-5 h-5" />
</button>
```

**Expected:** Should mark event as completed and call PUT endpoint to update event status

---

### 3. **Staff Page - Missing Button Handlers**

#### Line 218

**Issue:** "Check Incomplete (Auto-flag)" button without onClick handler

```javascript
<button className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-sm font-bold border border-red-100">
  Check Incomplete (Auto-flag)
</button>
```

**Expected:** Should call the backend `/staff/attendance/check-incomplete` endpoint

---

#### Line 244

**Issue:** "Edit" button in Attendance tab without onClick handler

```javascript
<button className="text-blue-500 hover:underline text-xs font-bold">
  Edit
</button>
```

**Expected:** Should open modal to edit attendance record using PUT `/staff/attendance/:attendanceId`

---

#### Line 264

**Issue:** Salary icon button without onClick handler (no action defined)

```javascript
<button className="bg-purple-50 p-2 rounded-full text-purple-600 hover:bg-purple-100">
  <IndianRupee className="w-4 h-4" />
</button>
```

**Expected:** Should either show salary details or open an edit modal

---

#### Line 291

**Issue:** "Process Payment" button without onClick handler

```javascript
<button className="w-full bg-[#6D28D9] text-white py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors">
  Process Payment
</button>
```

**Expected:** Should open a payment form or integrate with payment gateway

---

### 4. **Notification Bell Component - Missing Link Handler**

#### Line 104

**Issue:** "View All in Calendar" link without onClick handler

```javascript
<div className="p-3 border-t border-gray-100 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
  <span className="text-xs font-bold text-[#6D28D9]">View All in Calendar</span>
</div>
```

**Expected:** Should navigate to `/calendar` page

---

## Backend Issues

### 1. **Dashboard Route - Incomplete Graph Data**

**File:** `backend/routes/dashboardRoutes.js` (Lines ~70-85)

**Issue:** Graph data structures are empty/mocked

```javascript
const revenueGraph = {
  daily: [], // Aggregated per day
  monthly: [], // Aggregated per month
  yearly: [], // Aggregated per year
};

const orderGraph = {
  weekly: [],
  monthly: [],
  yearly: [],
};
```

**Expected:** Should aggregate data from Orders and Payments using MongoDB aggregation pipeline

---

### 2. **Incomplete Staff Attendance UI Data**

**File:** `frontend/src/pages/Staff.jsx` (Line ~230-245)

**Issue:** Attendance table shows hardcoded "Pending" status and "--:--" times

```javascript
<td className="px-4 py-4">
   <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold">Pending</span>
</td>
<td className="px-4 py-4 text-gray-500 text-sm">--:--</td>
<td className="px-4 py-4 text-gray-500 text-sm">--:--</td>
```

**Expected:** Should fetch actual attendance records from backend and display real data

---

### 3. **Missing Salary Payment Processing**

**Issue:** Staff salary payment feature is incomplete

- No backend endpoint to process salary payments
- Frontend "Process Payment" button has no handler
- No salary calculation logic tied to actual attendance data

**Expected Implementation:**

- Create `POST /api/staff/:id/salary/pay` endpoint
- Accept amount, method, transaction details
- Update staff payment status
- Record transaction

---

### 4. **Calendar Events - Missing Completion Toggle**

**File:** `frontend/src/pages/CalendarSystem.jsx` (Line 120)

**Issue:** CheckCircle2 button to mark events as complete has no onClick handler

**Expected:** Should call `PUT /api/calendar/:id` with `{ completed: true }`

---

## Console Errors & Warnings Found

| File                 | Line | Type          | Message                           |
| -------------------- | ---- | ------------- | --------------------------------- |
| Orders.jsx           | 37   | console.error | 'Failed to fetch orders'          |
| Orders.jsx           | 48   | console.error | 'Failed to fetch dependencies'    |
| Orders.jsx           | 103  | console.error | 'Failed to save order'            |
| Orders.jsx           | 121  | console.error | 'Failed to record payment'        |
| Orders.jsx           | 150  | console.error | 'Failed to delete'                |
| Customers.jsx        | 27   | console.error | 'Failed to fetch customers'       |
| Customers.jsx        | 57   | console.error | 'Failed to save customer'         |
| Customers.jsx        | 80   | console.error | 'Failed to delete'                |
| Staff.jsx            | 25   | console.error | 'Failed to fetch staff'           |
| Staff.jsx            | 39   | console.error | 'Failed to fetch attendance'      |
| Dashboard.jsx        | 30   | console.error | 'Failed to fetch dashboard'       |
| CalendarSystem.jsx   | 25   | console.error | 'Failed to fetch calendar events' |
| NotificationBell.jsx | 30   | console.error | 'Failed to load notifications'    |
| Workflow.jsx         | 34   | console.error | 'Failed to fetch workflow'        |
| Workflow.jsx         | 52   | console.error | 'Failed to update status'         |
| WhiteboardModal.jsx  | 43   | console.error | (generic error)                   |
| AuthContext.jsx      | 19   | console.error | 'Session expired or invalid'      |

---

## Data Flow Issues

### 1. **Incomplete Order Creation Workflow**

**Issue:** Orders can be created with address field that's not stored in form data

- Line 420 in Orders.jsx has textarea for address but doesn't update formData
- Backend Order model may not have address field properly initialized

---

### 2. **Payment Recording Issues**

**Issue:** Payment recording in Orders.jsx may conflict with Payment model structure

- Frontend sends `orderId` but backend expects `order` field (different naming)
- No validation that order exists before recording payment

---

### 3. **Missing Whiteboard Data Save**

**Issue:** WhiteboardModal component saves to order but structure may not match Order schema

- No validation of imageUrls and drawingUrls format
- No cleanup of old whiteboard data before update

---

## Summary

**Critical Issues:** 9

- Missing onClick handlers on functional buttons
- Incomplete API integration for features

**Important Issues:** 5

- Missing graph data aggregation
- Incomplete salary payment system
- Hardcoded mock data in attendance display

**Minor Issues:** Multiple console.error statements that need proper error handling

**Total Issues Found:** 20+
