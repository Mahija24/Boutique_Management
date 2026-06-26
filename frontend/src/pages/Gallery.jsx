import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';

const galleryCategories = ['Frock', 'Blouse', 'Lehenga', 'Other'];

export default function Gallery() {
  const [gallery, setGallery] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [imageName, setImageName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/gallery');
        setGallery(data || []);
      } catch (e) {
        console.error('Failed to fetch gallery', e);
      }
    };
    fetch();
  }, []);

  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImageName(file.name);
    setSelectedCategory('');

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPreview(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryUpload = async () => {
    if (!selectedFile || !selectedPreview) {
      alert('Please select an image first.');
      return;
    }
    if (!selectedCategory) {
      alert('Please choose a category.');
      return;
    }
    if (!imageName.trim()) {
      alert('Please enter a name for this image.');
      return;
    }

    try {
      const payload = {
        name: imageName.trim(),
        category: selectedCategory,
        dataUrl: selectedPreview,
        uploadedAt: new Date().toISOString(),
      };
      const { data } = await api.post('/gallery', payload);
      setGallery((prev) => [data, ...prev]);
      setSelectedFile(null);
      setSelectedPreview('');
      setSelectedCategory('');
      setImageName('');
    } catch (postError) {
      console.error('Failed to upload gallery image', postError);
      alert('Upload failed. Please try again.');
    }
  };

  const removeImage = async (id) => {
    if (!id) return;
    try {
      await api.delete(`/gallery/${id}`);
      setGallery((prev) => prev.filter((img) => (img._id || img.id) !== id));
    } catch (deleteError) {
      console.error('Failed to delete gallery image', deleteError);
      alert('Could not delete image. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Design Gallery</h1>
        <button
          type="button"
          onClick={handleUploadClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> Upload
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {selectedFile && (
        <div className="mb-6 rounded-2xl border border-dashed border-purple-300 bg-purple-50 p-4 text-sm text-purple-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">Selected file:</div>
              <div className="truncate">{selectedFile.name}</div>
            </div>
            <button
              type="button"
              onClick={handleGalleryUpload}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white text-sm font-semibold hover:bg-purple-700"
            >
              Upload image
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
            {selectedPreview && (
              <img src={selectedPreview} alt="preview" className="h-36 w-full rounded-2xl object-cover md:h-36" />
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {galleryCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category);
                        if (!imageName || imageName === selectedFile.name) {
                          setImageName(category);
                        }
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedCategory === category ? 'bg-purple-600 text-white' : 'border border-purple-200 bg-white text-purple-700 hover:bg-purple-50'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Name</label>
                <input
                  type="text"
                  value={imageName}
                  onChange={(e) => setImageName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter image name"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {gallery.length === 0 ? (
        <div className="text-sm text-gray-500">No images yet.</div>
      ) : (
        galleryCategories.map((category) => {
          const categoryImages = gallery.filter((img) => (img.category || 'Other') === category);
          if (categoryImages.length === 0) return null;
          return (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {categoryImages.map((img) => (
                  <div key={img._id || img.name} className="rounded-lg overflow-hidden border bg-white p-2">
                    <img src={img.dataUrl} alt={img.name} className="w-full h-40 object-cover" />
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm text-gray-700 truncate">{img.name}</div>
                      <button type="button" className="text-red-500" onClick={() => removeImage(img._id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
