import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    purpose: { type: String, required: true },
    notes: { type: String },
    date: { type: Date, required: true },
    status: { type: String, default: 'Scheduled' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
