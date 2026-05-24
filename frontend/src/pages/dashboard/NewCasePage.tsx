import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft, Upload, X, MapPin, User, Calendar, Phone,
  Mail, Ruler, Weight, Eye as EyeIcon, Save, Plus, Image as ImageIcon,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import Skeleton from '../../components/common/Skeleton';
import { useCaseStore } from '../../stores/caseStore';

/* ---------- types ---------- */
interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  idNumber: string;
}

interface PhysicalDescription {
  height: string;
  weight: string;
  eyeColor: string;
  hairColor: string;
  skinTone: string;
  bloodType: string;
  distinguishingMarks: string;
  medicalConditions: string;
}

interface LastSeenInfo {
  date: string;
  location: string;
  lat: number;
  lng: number;
  circumstances: string;
  clothing: string;
}

interface GuardianInfo {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

interface CaseDetails {
  priority: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  assignedOfficer: string;
}

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';

const markerIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40"><path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="#00f5ff"/><circle cx="14" cy="14" r="6" fill="#0a1628"/></svg>`,
    ),
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
});

/* ---------- location picker ---------- */
const LocationPicker: React.FC<{
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}> = ({ lat, lng, onChange }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return lat !== 0 && lng !== 0 ? (
    <Marker position={[lat, lng]} icon={markerIcon} />
  ) : null;
};

/* ========== PAGE ========== */
const NewCasePage: React.FC = () => {
  const navigate = useNavigate();
  const { createCase, loading } = useCaseStore();

  const [step, setStep] = useState(0);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    firstName: '', lastName: '', dateOfBirth: '', gender: '', nationality: '', idNumber: '',
  });
  const [physical, setPhysical] = useState<PhysicalDescription>({
    height: '', weight: '', eyeColor: '', hairColor: '', skinTone: '',
    bloodType: '', distinguishingMarks: '', medicalConditions: '',
  });
  const [lastSeen, setLastSeen] = useState<LastSeenInfo>({
    date: '', location: '', lat: 0, lng: 0, circumstances: '', clothing: '',
  });
  const [guardian, setGuardian] = useState<GuardianInfo>({
    name: '', relationship: '', phone: '', email: '', address: '',
  });
  const [caseDetails, setCaseDetails] = useState<CaseDetails>({
    priority: 'medium', category: '', description: '', assignedOfficer: '',
  });

  const [primaryPhoto, setPrimaryPhoto] = useState<File | null>(null);
  const [primaryPhotoPreview, setPrimaryPhotoPreview] = useState<string>('');
  const [additionalPhotos, setAdditionalPhotos] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

  const handlePrimaryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPrimaryPhoto(file);
      setPrimaryPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAdditionalPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAdditionalPhotos((prev) => [...prev, ...files]);
    setAdditionalPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== index));
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('personalInfo', JSON.stringify(personalInfo));
    formData.append('physical', JSON.stringify(physical));
    formData.append('lastSeen', JSON.stringify(lastSeen));
    formData.append('guardian', JSON.stringify(guardian));
    formData.append('caseDetails', JSON.stringify(caseDetails));
    if (primaryPhoto) formData.append('primaryPhoto', primaryPhoto);
    additionalPhotos.forEach((f) => formData.append('additionalPhotos', f));

    await createCase(formData);
    navigate('/dashboard/cases');
  };

  const sections = [
    { label: 'Personal Info', icon: <User size={16} /> },
    { label: 'Physical Description', icon: <Ruler size={16} /> },
    { label: 'Last Seen Details', icon: <MapPin size={16} /> },
    { label: 'Guardian Info', icon: <Phone size={16} /> },
    { label: 'Case Details', icon: <Calendar size={16} /> },
    { label: 'Photos', icon: <ImageIcon size={16} /> },
  ];

  const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#00f5ff]/50 transition-colors';
  const labelCls = 'block text-[11px] text-gray-500 mb-1 uppercase tracking-wider';

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      {/* header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/dashboard/cases')} className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Case</h1>
          <p className="text-xs text-gray-400 mt-0.5">Fill in all required information to create a new missing person case</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* step sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className={`${CARD_BG} rounded-2xl p-3 space-y-1 sticky top-6`}>
            {sections.map((sec, i) => (
              <button
                key={sec.label}
                onClick={() => setStep(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  step === i
                    ? 'bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                {sec.icon} {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* form content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {/* step 0: personal info */}
            {step === 0 && (
              <motion.div key="personal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${CARD_BG} rounded-2xl p-6`}>
                <h2 className="text-white font-semibold mb-5">Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>First Name *</label>
                    <input value={personalInfo.firstName} onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })} placeholder="Enter first name" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Last Name *</label>
                    <input value={personalInfo.lastName} onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })} placeholder="Enter last name" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth *</label>
                    <input type="date" value={personalInfo.dateOfBirth} onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Gender *</label>
                    <select value={personalInfo.gender} onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })} className={inputCls}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Nationality</label>
                    <input value={personalInfo.nationality} onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })} placeholder="Nationality" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ID Number</label>
                    <input value={personalInfo.idNumber} onChange={(e) => setPersonalInfo({ ...personalInfo, idNumber: e.target.value })} placeholder="National ID / Passport" className={inputCls} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* step 1: physical description */}
            {step === 1 && (
              <motion.div key="physical" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${CARD_BG} rounded-2xl p-6`}>
                <h2 className="text-white font-semibold mb-5">Physical Description</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Height</label>
                    <input value={physical.height} onChange={(e) => setPhysical({ ...physical, height: e.target.value })} placeholder="e.g. 5'10&quot; / 178cm" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Weight</label>
                    <input value={physical.weight} onChange={(e) => setPhysical({ ...physical, weight: e.target.value })} placeholder="e.g. 70kg / 154lbs" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Eye Color</label>
                    <select value={physical.eyeColor} onChange={(e) => setPhysical({ ...physical, eyeColor: e.target.value })} className={inputCls}>
                      <option value="">Select</option>
                      <option value="brown">Brown</option>
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="hazel">Hazel</option>
                      <option value="black">Black</option>
                      <option value="gray">Gray</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Hair Color</label>
                    <select value={physical.hairColor} onChange={(e) => setPhysical({ ...physical, hairColor: e.target.value })} className={inputCls}>
                      <option value="">Select</option>
                      <option value="black">Black</option>
                      <option value="brown">Brown</option>
                      <option value="blonde">Blonde</option>
                      <option value="red">Red</option>
                      <option value="gray">Gray</option>
                      <option value="white">White</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Skin Tone</label>
                    <input value={physical.skinTone} onChange={(e) => setPhysical({ ...physical, skinTone: e.target.value })} placeholder="e.g. Fair, Medium, Dark" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Blood Type</label>
                    <select value={physical.bloodType} onChange={(e) => setPhysical({ ...physical, bloodType: e.target.value })} className={inputCls}>
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className={labelCls}>Distinguishing Marks</label>
                    <textarea value={physical.distinguishingMarks} onChange={(e) => setPhysical({ ...physical, distinguishingMarks: e.target.value })} placeholder="Scars, tattoos, birthmarks..." rows={3} className={inputCls + ' resize-none'} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className={labelCls}>Medical Conditions</label>
                    <textarea value={physical.medicalConditions} onChange={(e) => setPhysical({ ...physical, medicalConditions: e.target.value })} placeholder="Any known medical conditions, allergies, medications..." rows={3} className={inputCls + ' resize-none'} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* step 2: last seen */}
            {step === 2 && (
              <motion.div key="lastseen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${CARD_BG} rounded-2xl p-6`}>
                <h2 className="text-white font-semibold mb-5">Last Seen Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Date Last Seen *</label>
                    <input type="date" value={lastSeen.date} onChange={(e) => setLastSeen({ ...lastSeen, date: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Location *</label>
                    <input value={lastSeen.location} onChange={(e) => setLastSeen({ ...lastSeen, location: e.target.value })} placeholder="Address or description" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Circumstances</label>
                    <textarea value={lastSeen.circumstances} onChange={(e) => setLastSeen({ ...lastSeen, circumstances: e.target.value })} placeholder="Describe the circumstances..." rows={3} className={inputCls + ' resize-none'} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Clothing Description</label>
                    <textarea value={lastSeen.clothing} onChange={(e) => setLastSeen({ ...lastSeen, clothing: e.target.value })} placeholder="What were they wearing?" rows={2} className={inputCls + ' resize-none'} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Pin Location on Map (click to set)</label>
                  <div className="h-64 rounded-xl overflow-hidden">
                    <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationPicker
                        lat={lastSeen.lat}
                        lng={lastSeen.lng}
                        onChange={(lat, lng) => setLastSeen({ ...lastSeen, lat, lng })}
                      />
                    </MapContainer>
                  </div>
                  {lastSeen.lat !== 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      <MapPin size={12} className="inline mr-1 text-[#00f5ff]" />
                      {lastSeen.lat.toFixed(6)}, {lastSeen.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* step 3: guardian */}
            {step === 3 && (
              <motion.div key="guardian" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${CARD_BG} rounded-2xl p-6`}>
                <h2 className="text-white font-semibold mb-5">Guardian / Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name *</label>
                    <input value={guardian.name} onChange={(e) => setGuardian({ ...guardian, name: e.target.value })} placeholder="Guardian full name" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Relationship *</label>
                    <select value={guardian.relationship} onChange={(e) => setGuardian({ ...guardian, relationship: e.target.value })} className={inputCls}>
                      <option value="">Select</option>
                      <option value="parent">Parent</option>
                      <option value="spouse">Spouse</option>
                      <option value="sibling">Sibling</option>
                      <option value="guardian">Legal Guardian</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Phone *</label>
                    <input value={guardian.phone} onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })} placeholder="+1 (555) 000-0000" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={guardian.email} onChange={(e) => setGuardian({ ...guardian, email: e.target.value })} placeholder="email@example.com" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Address</label>
                    <textarea value={guardian.address} onChange={(e) => setGuardian({ ...guardian, address: e.target.value })} placeholder="Full address" rows={2} className={inputCls + ' resize-none'} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* step 4: case details */}
            {step === 4 && (
              <motion.div key="casedetails" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${CARD_BG} rounded-2xl p-6`}>
                <h2 className="text-white font-semibold mb-5">Case Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Priority *</label>
                    <select value={caseDetails.priority} onChange={(e) => setCaseDetails({ ...caseDetails, priority: e.target.value as CaseDetails['priority'] })} className={inputCls}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <select value={caseDetails.category} onChange={(e) => setCaseDetails({ ...caseDetails, category: e.target.value })} className={inputCls}>
                      <option value="">Select</option>
                      <option value="child">Child</option>
                      <option value="adult">Adult</option>
                      <option value="elderly">Elderly</option>
                      <option value="special_needs">Special Needs</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Case Description</label>
                    <textarea value={caseDetails.description} onChange={(e) => setCaseDetails({ ...caseDetails, description: e.target.value })} placeholder="Additional details about the case..." rows={4} className={inputCls + ' resize-none'} />
                  </div>
                </div>
                {/* auto-generated case number preview */}
                <div className="mt-5 p-4 bg-[#0a1628]/60 rounded-xl border border-[#00f5ff]/20">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Case Number (auto-generated)</p>
                  <p className="text-[#00f5ff] font-mono text-lg font-bold">MPD-2026-XXXXX</p>
                  <p className="text-[10px] text-gray-600 mt-1">Will be assigned upon submission</p>
                </div>
              </motion.div>
            )}

            {/* step 5: photos */}
            {step === 5 && (
              <motion.div key="photos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${CARD_BG} rounded-2xl p-6`}>
                <h2 className="text-white font-semibold mb-5">Photos</h2>
                {/* primary photo */}
                <div className="mb-6">
                  <label className={labelCls}>Primary Photo *</label>
                  {primaryPhotoPreview ? (
                    <div className="relative w-40 h-52 rounded-xl overflow-hidden">
                      <img src={primaryPhotoPreview} alt="Primary" className="w-full h-full object-cover" />
                      <button onClick={() => { setPrimaryPhoto(null); setPrimaryPhotoPreview(''); }} className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg text-white hover:bg-red-500/60 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-40 h-52 rounded-xl border-2 border-dashed border-white/20 hover:border-[#00f5ff] cursor-pointer transition-colors">
                      <Upload size={24} className="text-gray-500 mb-2" />
                      <span className="text-xs text-gray-500">Upload primary photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePrimaryPhoto} />
                    </label>
                  )}
                </div>
                {/* additional photos */}
                <div>
                  <label className={labelCls}>Additional Photos</label>
                  <div className="flex flex-wrap gap-3">
                    {additionalPreviews.map((preview, i) => (
                      <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeAdditionalPhoto(i)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded text-white hover:bg-red-500/60 transition-colors">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-[#00f5ff] cursor-pointer transition-colors">
                      <Plus size={20} className="text-gray-500" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalPhotos} />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* nav buttons */}
          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Back
            </button>
            {step < sections.length - 1 ? (
              <button
                onClick={() => setStep((s) => Math.min(sections.length - 1, s + 1))}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30 hover:bg-[#00f5ff]/25 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#00f5ff] to-[#00ff88] text-[#0a1628] hover:brightness-110 transition-all disabled:opacity-50"
              >
                <Save size={16} /> {loading ? 'Creating...' : 'Create Case'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCasePage;
