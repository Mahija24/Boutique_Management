import express from 'express';
import Customer from '../models/Customer.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { protect, ownerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Generate Customer ID
const generateCustomerId = async () => {
  const count = await Customer.countDocuments();
  return `CUST-${(count + 1).toString().padStart(4, '0')}`;
};

// Create a new customer
router.post('/', protect, async (req, res) => {
  try {
    const customerId = await generateCustomerId();
    const customer = await Customer.create({ ...req.body, customerId });
    
    // Auto-create calendar events for important dates
    if (req.body.importantDates && req.body.importantDates.length > 0) {
      for (const dateObj of req.body.importantDates) {
        await CalendarEvent.create({
          title: `${customer.name}'s ${dateObj.eventName}`,
          description: `Important date for customer ${customer.phone}`,
          date: dateObj.date,
          type: 'Customer',
          recurring: 'Yearly',
          relatedId: customer._id
        });
      }
    }
    
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all customers (with search)
router.get('/', protect, async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    };
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single customer
router.get('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update customer
router.put('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    // Sync calendar events for important dates
    if (req.body.importantDates) {
      await CalendarEvent.deleteMany({ relatedId: customer._id, type: 'Customer' });
      for (const dateObj of req.body.importantDates) {
        await CalendarEvent.create({
          title: `${customer.name}'s ${dateObj.eventName}`,
          description: `Important date for customer ${customer.phone}`,
          date: dateObj.date,
          type: 'Customer',
          recurring: 'Yearly',
          relatedId: customer._id
        });
      }
    }

    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete customer (Owner only)
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
