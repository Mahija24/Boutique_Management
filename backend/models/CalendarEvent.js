import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  type: { 
    type: String, 
    enum: ['Normal', 'Red Alert', 'Payment', 'Delivery', 'Customer'], 
    required: true 
  },
  recurring: { 
    type: String, 
    enum: ['None', 'Monthly', 'Yearly'], 
    default: 'None' 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Completed'], 
    default: 'Active' 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId } // Can be Customer ID, Order ID, etc.
}, { timestamps: true });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
export default CalendarEvent;
