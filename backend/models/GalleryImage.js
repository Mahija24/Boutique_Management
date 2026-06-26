import mongoose from 'mongoose';

const galleryImageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'Other' },
    dataUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const GalleryImage = mongoose.model('GalleryImage', galleryImageSchema);
export default GalleryImage;
