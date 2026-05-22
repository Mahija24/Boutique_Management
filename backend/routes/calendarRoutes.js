import express from 'express';
import CalendarEvent from '../models/CalendarEvent.js';
import { protect, ownerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all calendar events with optional filters
router.get('/', protect, async (req, res) => {
  try {
    const { type } = req.query; // e.g. 'Red Alert', 'Delivery', 'Payment', 'Customer'
    let query = {};
    if (type) {
      query.type = type;
    }
    
    // Auto-fetch events from today onwards, or based on month
    const events = await CalendarEvent.find(query).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new manual event (e.g. Rent, Red Alert)
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const event = await CalendarEvent.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark event as completed or update it
router.put('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete event
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
