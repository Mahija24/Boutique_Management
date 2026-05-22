import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amountPaid: { type: Number, required: true },
  method: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Online'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  transactionId: { type: String }, // For online payments
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
