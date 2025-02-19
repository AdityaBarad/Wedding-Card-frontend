// only bulk error //
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Download, Share2, Upload, X, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import axios from 'axios';

export function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [guests, setGuests] = useState([]);
  const [generatedImages, setGeneratedImages] = useState({});
  const [newGuest, setNewGuest] = useState({ name: '', whatsapp: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkGuests, setBulkGuests] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationQueue, setGenerationQueue] = useState([]);

  useEffect(() => {
    fetchProjectAndGuests();
  }, [id]);

  // Process generation queue
  useEffect(() => {
    const processQueue = async () => {
      if (generationQueue.length > 0 && !isGenerating) {
        const guest = generationQueue[0];
        setIsGenerating(true);
        await generateInvitationCardForGuest(guest);
        setIsGenerating(false);
        setGenerationQueue(prev => prev.slice(1));
      }
    };

    processQueue();
  }, [generationQueue, isGenerating]);

  const fetchProjectAndGuests = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw new Error('Failed to fetch project');

      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .eq('project_id', id);

      if (guestsError) throw new Error('Failed to fetch guests');
      
      setProject(projectData);
      setGuests(guestsData);
      
      const imagesMap = {};
      guestsData.forEach((guest) => {
        if (guest.invitation_image_url) {
          imagesMap[guest.name] = guest.invitation_image_url;
        }
      });
      setGeneratedImages(imagesMap);
      
      if (guestsData.length > 0) {
        setSelectedGuest(guestsData[0]);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch project details');
      setLoading(false);
    }
  };

  const generateInvitationCardForGuest = async (guest) => {
    if (!guest?.name) {
      console.warn('Invalid guest');
      return;
    }

    try {
      // Validate guest data before making the request
      if (!guest.id || !guest.name) {
        throw new Error('Invalid guest data');
      }

      const response = await axios.post('http://localhost:5000/generate-invitations', {
        projectId: id,
        guestName: guest.name,
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      if (!response.data?.imageUrl) {
        throw new Error('No image URL received from server');
      }

      const { error: updateError } = await supabase
        .from('guests')
        .update({ invitation_image_url: response.data.imageUrl })
        .eq('id', guest.id);

      if (updateError) {
        throw new Error('Failed to update guest with image URL');
      }
  
      setGeneratedImages(prev => ({
        ...prev,
        [guest.name]: response.data.imageUrl,
      }));
    } catch (error) {
      console.error('Generation error:', error);
      let errorMessage = 'Failed to generate invitation';
      
      if (error.response) {
        // Server responded with error
        errorMessage = `Server error: ${error.response.status}`;
        if (error.response.data?.message) {
          errorMessage += ` - ${error.response.data.message}`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check if the server is running.';
      }
      
      setError(errorMessage);
    }
  };

  const addGuest = async (e) => {
    e.preventDefault();
    try {
      if (!newGuest.name.trim()) {
        setError('Guest name is required');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('guests')
        .insert([{ 
          project_id: id, 
          name: newGuest.name.trim(), 
          whatsapp: newGuest.whatsapp?.trim() || null 
        }])
        .select();
  
      if (insertError) throw new Error('Failed to add guest');

      if (data?.[0]) {
        const newAddedGuest = data[0];
        setGuests(prev => [...prev, newAddedGuest]);
        setNewGuest({ name: '', whatsapp: '' });
        setSelectedGuest(newAddedGuest);
        setGenerationQueue(prev => [...prev, newAddedGuest]);
      }
    } catch (err) {
      setError(err.message || 'Failed to add guest');
    }
  };
  
  const handleBulkGuestAdd = async (e) => {
    e.preventDefault();
    try {
      const guestEntries = bulkGuests
        .split('\n')
        .map(entry => {
          const parts = entry.split(',');
          const name = parts[0]?.trim();
          const whatsapp = parts[1]?.trim();
          return name ? { name, whatsapp: whatsapp || null } : null;
        })
        .filter(Boolean);
  
      if (guestEntries.length === 0) {
        setError('No valid guest entries found');
        return;
      }
  
      // Validate each guest entry
      const validGuests = guestEntries.filter(guest => {
        if (!guest.name || guest.name.length > 100) {
          return false;
        }
        if (guest.whatsapp && guest.whatsapp.length > 20) {
          return false;
        }
        return true;
      });
  
      if (validGuests.length !== guestEntries.length) {
        setError('Some guest entries are invalid');
        return;
      }
  
      const { data, error: insertError } = await supabase
        .from('guests')
        .insert(validGuests.map(g => ({ ...g, project_id: id })))
        .select();
  
      if (insertError) throw new Error('Failed to add guests');
  
      if (data) {
        setGuests(prev => [...prev, ...data]);
        setBulkGuests('');
        setShowBulkInput(false);
        
        // Queue all new guests for invitation generation
        setGenerationQueue(prev => [...prev, ...data]);
      }
    } catch (err) {
      setError(err.message || 'Failed to add guests in bulk');
    }
  };

  const handleDownload = async (imageUrl, guestName) => {
    if (!imageUrl || !guestName) {
      setError('Invalid image URL or guest name');
      return;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invitation_${guestName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download invitation');
    }
  };

  const handleShare = async (guest) => {
    if (!guest?.whatsapp) {
      setError('No WhatsApp number available for this guest');
      return;
    }

    const imageUrl = generatedImages[guest.name];
    if (!imageUrl) {
      setError('No invitation image available to share');
      return;
    }

    try {
      // Clean and format WhatsApp number
      const cleanNumber = guest.whatsapp.replace(/[^0-9+]/g, '');
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
        `Here's your invitation!\n${imageUrl}`
      )}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      setError('Failed to open WhatsApp sharing');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader className="animate-spin" size={24} />
          <span className="text-lg">Loading project details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4"> {/* Reduced padding */}
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4" // Reduced margin
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-2xl p-6"> {/* Reduced padding */}
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{project?.title}</h1> {/* Reduced font size and margin */}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center justify-between"> {/* Reduced padding and margin */}
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Guest Input Form */}
          <form onSubmit={addGuest} className="flex gap-4 mb-6"> {/* Reduced margin */}
            <input
              type="text"
              placeholder="Guest Name"
              value={newGuest.name}
              onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" // Reduced padding
              required
            />
            <input
              type="text"
              placeholder="WhatsApp Number"
              value={newGuest.whatsapp}
              onChange={(e) => setNewGuest({ ...newGuest, whatsapp: e.target.value })}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" // Reduced padding
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105" // Reduced padding
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Guest
            </button>
          </form>

          {/* Bulk Guest Input */}
          {showBulkInput ? (
            <form onSubmit={handleBulkGuestAdd} className="mb-6"> {/* Reduced margin */}
              <textarea
                value={bulkGuests}
                onChange={(e) => setBulkGuests(e.target.value)}
                placeholder="Enter names, one per line, optionally with a comma-separated WhatsApp number"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" // Reduced padding
                rows={4}
              />
              <div className="mt-3 flex gap-2"> {/* Reduced margin */}
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105" // Reduced padding
                >
                  Add Bulk Guests
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkInput(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900" // Reduced padding
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowBulkInput(true)}
              className="mb-6 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105" // Reduced padding
            >
              <Upload className="w-5 h-5 mr-2" />
              Bulk Add Guests
            </button>
          )}

          {/* Guest List and Details */}
          <div className="grid grid-cols-12 gap-6"> {/* Reduced gap */}
            <div className="col-span-4 border-r pr-4"> {/* Reduced padding */}
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest List</h2> {/* Reduced font size and margin */}
              <div className="space-y-3"> {/* Reduced spacing */}
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    onClick={() => setSelectedGuest(guest)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      selectedGuest?.id === guest.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">{guest.name}</h3>
                    <p className="text-sm text-gray-600">WhatsApp: {guest.whatsapp || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-8">
              {selectedGuest ? (
                <div className="bg-gray-50 rounded-2xl p-4"> {/* Reduced padding */}
                  <div className="flex justify-between items-start mb-4"> {/* Reduced margin */}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedGuest.name}</h2> {/* Reduced font size */}
                      <p className="text-gray-600">WhatsApp: {selectedGuest.whatsapp || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2"> {/* Reduced gap */}
                      <button
                        onClick={() => handleDownload(generatedImages[selectedGuest.name], selectedGuest.name)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105" // Reduced padding
                        disabled={!generatedImages[selectedGuest.name]}
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                      <button
                        onClick={() => handleShare(selectedGuest)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105" // Reduced padding
                        disabled={!generatedImages[selectedGuest.name] || !selectedGuest.whatsapp}
                      >
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                    </div>
                  </div>

                  {generationQueue.includes(selectedGuest) ? (
                    <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2"> {/* Reduced gap */}
                        <Loader className="animate-spin w-6 h-6 text-gray-600" /> {/* Reduced size */}
                        <p className="text-gray-600">Generating invitation...</p>
                      </div>
                    </div>
                  ) : generatedImages[selectedGuest.name] ? (
                    <img
                      src={generatedImages[selectedGuest.name]}
                      alt="Invitation"
                      className="w-full rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                      <p className="text-gray-600">No invitation generated yet</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Select a guest to view their invitation
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}