import express from 'express';
import GalleryImage from '../models/GalleryImage.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const normalizeCategory = (name) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('frock')) return 'Frock';
  if (lower.includes('blouse')) return 'Blouse';
  if (lower.includes('lehenga')) return 'Lehenga';
  return 'Other';
};

router.get('/', protect, async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ uploadedAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, dataUrl, category } = req.body;
    if (!name || !dataUrl) {
      return res.status(400).json({ message: 'Name and image data are required.' });
    }
    const normalizedCategory = category || normalizeCategory(name);
    const image = await GalleryImage.create({ name, dataUrl, category: normalizedCategory, uploadedAt: new Date() });
    res.status(201).json(image);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const image = await GalleryImage.findByIdAndDelete(req.params.id);
    if (!image) return res.status(404).json({ message: 'Image not found' });
    res.json({ message: 'Image removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
