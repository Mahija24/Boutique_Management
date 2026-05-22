import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., 'Rent', 'Electricity Bill'
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Paid'], 
    default: 'Pending' 
  }
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
