import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String },
  measurements: {
    chest: { type: Number },
    waist: { type: Number },
    hip: { type: Number },
    length: { type: Number },
    shoulder: { type: Number },
    sleeves: { type: Number },
    neck: { type: Number },
    otherDetails: { type: String }
  },
  notes: { type: String },
  importantDates: [{
    eventName: { type: String, required: true }, // e.g., 'Birthday', 'Marriage Day'
    date: { type: Date, required: true }
  }]
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
