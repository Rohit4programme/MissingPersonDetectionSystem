import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ChevronLeft, ChevronRight, Check, Upload, X, MapPin,
  User, FileText, Camera, ClipboardCheck, AlertCircle,
} from 'lucide-react';

import Skeleton from '../../components/common/Skeleton';
import { useCaseStore } from '../../stores/caseStore';

/* ---------- types ---------- */
interface PersonDetails {
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  eyeColor: string;
  hairColor: string;
  skinTone: string;
  physicalDescription: string;
  medicalConditions: string;
  distinguishingMarks: string;
}

interface Circumstances {
  lastSeenDate: string;
  lastSeenTime: string;
  lastSeenLat: number | null;
  lastSeenLng: number | null;
  lastSeenAddress: string;
  clothingDescription: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  secondaryContact: string;
  additionalNotes: string;
}

interface Photos {
  primaryPhoto: File | null;
  primaryPhotoPreview: string;
  additionalPhotos: File[];
  additionalPreviews: string[];
}

interface CaseDetails {
  firNumber: string;
  policeStation: string;
  district: string;
  priority: 'high' | 'medium' | 'low';
  assignedOfficer: string;
  caseNotes: string;
}

interface FormState {
  person: PersonDetails;
  circumstances: Circumstances;
  photos: Photos;
  caseDetails: CaseDetails;
}

type Step = 0 | 1 | 2 | 3 | 4;

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_RED = '#ff3b3b';
const DRAFT_KEY = 'case_draft';

const STEPS = [
  { label: 'Person Details', icon: User },
  { label: 'Circumstances', icon: MapPin },
  { label: 'Photos', icon: Camera },
  { label: 'Case Details', icon: FileText },
  { label: 'Review', icon: ClipboardCheck },
];

const initialForm: FormState = {
  person: {
    firstName: '', lastName: '', age: '', gender: '', height: '', weight: '',
    eyeColor: '', hairColor: '', skinTone: '', physicalDescription: '',
    medicalConditions: '', distinguishingMarks: '',
  },
  circumstances: {
    lastSeenDate: '', lastSeenTime: '', lastSeenLat: null, lastSeenLng: null,
    lastSeenAddress: '', clothingDescription: '', guardianName: '', guardianRelation: '',
    guardianPhone: '', secondaryContact: '', additionalNotes: '',
  },
  photos: {
    primaryPhoto: null, primaryPhotoPreview: '',
    additionalPhotos: [], additionalPreviews: [],
  },
  caseDetails: {
    firNumber: '', policeStation: '', district: '',
    priority: 'medium', assignedOfficer: '', caseNotes: '',
  },
};

/* ---------- location picker ---------- */
const LocationPicker: React.FC<{
  lat: number | null;
  lng: number | null;
  onSelect: (lat: number, lng: number) => void;
}> = ({ lat, lng, onSelect }) => {
  const markerIcon = new L.Icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="#ff3b3b"/><circle cx="14" cy="14" r="6" fill="white"/></svg>`,
      ),
    iconSize: [28, 40],
    iconAnchor: [14, 40],
  });

  const MapClick: React.FC = () => {
    useMapEvents({
      click(e) {
        onSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  return (
    <div className="h-64 rounded-xl overflow-hidden">
      <MapContainer
        center={lat && lng ? [lat, lng] : [20.5937, 78.9629]}
        zoom={lat && lng ? 14 : 5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapClick />
        {lat && lng && <Marker position={[lat, lng]} icon={markerIcon} />}
      </MapContainer>
      <p className="text-[10px] text-gray-500 mt-1">Click on the map to set last seen location</p>
    </div>
  );
};

/* ---------- field wrapper ---------- */
const Field: React.FC<{
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, error, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
    {children}
    {error && (
      <p className="text-[10px] text-[#ff3b3b] mt-1 flex items-center gap-1">
        <AlertCircle size={10} /> {error}
      </p>
    )}
  </div>
);

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00f5ff]/50 transition-colors';

/* ========== PAGE ========== */
const CreateCasePage: React.FC = () => {
  const navigate = useNavigate();
  const { createCase, creating } = useCaseStore();

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /* restore draft */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        setForm((prev) => ({ ...prev, ...draft }));
      }
    } catch { /* ignore */ }
  }, []);

  /* auto-save draft */
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const { photos, ...rest } = form;
        localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
      } catch { /* ignore */ }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [form]);

  /* update helper */
  const updatePerson = (key: keyof PersonDetails, value: string) =>
    setForm((p) => ({ ...p, person: { ...p.person, [key]: value } }));

  const updateCircumstances = (key: keyof Circumstances, value: string | number | null) =>
    setForm((p) => ({ ...p, circumstances: { ...p.circumstances, [key]: value } }));

  const updateCaseDetails = (key: keyof CaseDetails, value: string) =>
    setForm((p) => ({ ...p, caseDetails: { ...p.caseDetails, [key]: value } }));

  /* photo handlers */
  const handlePrimaryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm((p) => ({
      ...p,
      photos: { ...p.photos, primaryPhoto: file, primaryPhotoPreview: preview },
    }));
  };

  const handleAdditionalPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const previews = files.map((f) => URL.createObjectURL(f));
    setForm((p) => ({
      ...p,
      photos: {
        ...p.photos,
        additionalPhotos: [...p.photos.additionalPhotos, ...files],
        additionalPreviews: [...p.photos.additionalPreviews, ...previews],
      },
    }));
  };

  const removeAdditionalPhoto = (idx: number) => {
    setForm((p) => ({
      ...p,
      photos: {
        ...p.photos,
        additionalPhotos: p.photos.additionalPhotos.filter((_, i) => i !== idx),
        additionalPreviews: p.photos.additionalPreviews.filter((_, i) => i !== idx),
      },
    }));
  };

  /* validation */
  const validateStep = useCallback((s: Step): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.person.firstName.trim()) errs.firstName = 'First name is required';
      if (!form.person.lastName.trim()) errs.lastName = 'Last name is required';
      if (!form.person.age.trim()) errs.age = 'Age is required';
      if (!form.person.gender) errs.gender = 'Gender is required';
    }
    if (s === 1) {
      if (!form.circumstances.lastSeenDate) errs.lastSeenDate = 'Date is required';
      if (!form.circumstances.lastSeenTime) errs.lastSeenTime = 'Time is required';
      if (!form.circumstances.guardianPhone.trim()) errs.guardianPhone = 'Contact number is required';
    }
    if (s === 2) {
      if (!form.photos.primaryPhoto) errs.primaryPhoto = 'Primary photo is required';
    }
    if (s === 3) {
      if (!form.caseDetails.firNumber.trim()) errs.firNumber = 'FIR number is required';
      if (!form.caseDetails.policeStation.trim()) errs.policeStation = 'Police station is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  /* navigation */
  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(4, s + 1) as Step);
    }
  };
  const prevStep = () => setStep((s) => Math.max(0, s - 1) as Step);

  /* submit */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({
        person: form.person,
        circumstances: form.circumstances,
        caseDetails: form.caseDetails,
      }));
      if (form.photos.primaryPhoto) formData.append('primaryPhoto', form.photos.primaryPhoto);
      form.photos.additionalPhotos.forEach((f) => formData.append('additionalPhotos', f));

      await createCase(formData);
      localStorage.removeItem(DRAFT_KEY);
      navigate('/dashboard/cases');
    } catch {
      /* error handled by store */
    } finally {
      setSubmitting(false);
    }
  };

  /* input style */
  const input = inputCls;

  /* ---------- step content ---------- */
  const renderStep0 = () => (
    <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Person Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name *" error={errors.firstName}>
          <input value={form.person.firstName} onChange={(e) => updatePerson('firstName', e.target.value)} placeholder="Enter first name" className={input} />
        </Field>
        <Field label="Last Name *" error={errors.lastName}>
          <input value={form.person.lastName} onChange={(e) => updatePerson('lastName', e.target.value)} placeholder="Enter last name" className={input} />
        </Field>
        <Field label="Age *" error={errors.age}>
          <input type="number" value={form.person.age} onChange={(e) => updatePerson('age', e.target.value)} placeholder="Age" className={input} />
        </Field>
        <Field label="Gender *" error={errors.gender}>
          <select value={form.person.gender} onChange={(e) => updatePerson('gender', e.target.value)} className={input}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Height">
          <input value={form.person.height} onChange={(e) => updatePerson('height', e.target.value)} placeholder="e.g., 5'8&quot; / 173cm" className={input} />
        </Field>
        <Field label="Weight">
          <input value={form.person.weight} onChange={(e) => updatePerson('weight', e.target.value)} placeholder="e.g., 70kg / 154lbs" className={input} />
        </Field>
        <Field label="Eye Color">
          <input value={form.person.eyeColor} onChange={(e) => updatePerson('eyeColor', e.target.value)} placeholder="Eye color" className={input} />
        </Field>
        <Field label="Hair Color">
          <input value={form.person.hairColor} onChange={(e) => updatePerson('hairColor', e.target.value)} placeholder="Hair color" className={input} />
        </Field>
        <Field label="Skin Tone">
          <input value={form.person.skinTone} onChange={(e) => updatePerson('skinTone', e.target.value)} placeholder="Skin tone" className={input} />
        </Field>
      </div>
      <Field label="Physical Description">
        <textarea value={form.person.physicalDescription} onChange={(e) => updatePerson('physicalDescription', e.target.value)} rows={3} placeholder="Describe physical appearance..." className={`${input} resize-none`} />
      </Field>
      <Field label="Medical Conditions">
        <textarea value={form.person.medicalConditions} onChange={(e) => updatePerson('medicalConditions', e.target.value)} rows={2} placeholder="Any medical conditions..." className={`${input} resize-none`} />
      </Field>
      <Field label="Distinguishing Marks">
        <textarea value={form.person.distinguishingMarks} onChange={(e) => updatePerson('distinguishingMarks', e.target.value)} rows={2} placeholder="Scars, tattoos, birthmarks..." className={`${input} resize-none`} />
      </Field>
    </motion.div>
  );

  const renderStep1 = () => (
    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Circumstances</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Last Seen Date *" error={errors.lastSeenDate}>
          <input type="date" value={form.circumstances.lastSeenDate} onChange={(e) => updateCircumstances('lastSeenDate', e.target.value)} className={input} />
        </Field>
        <Field label="Last Seen Time *" error={errors.lastSeenTime}>
          <input type="time" value={form.circumstances.lastSeenTime} onChange={(e) => updateCircumstances('lastSeenTime', e.target.value)} className={input} />
        </Field>
      </div>
      <Field label="Last Seen Location">
        <input
          value={form.circumstances.lastSeenAddress}
          onChange={(e) => updateCircumstances('lastSeenAddress', e.target.value)}
          placeholder="Enter address or click map below"
          className={input}
        />
      </Field>
      <LocationPicker
        lat={form.circumstances.lastSeenLat}
        lng={form.circumstances.lastSeenLng}
        onSelect={(lat, lng) => {
          updateCircumstances('lastSeenLat', lat);
          updateCircumstances('lastSeenLng', lng);
        }}
      />
      <Field label="Clothing Description">
        <textarea value={form.circumstances.clothingDescription} onChange={(e) => updateCircumstances('clothingDescription', e.target.value)} rows={2} placeholder="What were they wearing..." className={`${input} resize-none`} />
      </Field>
      <h3 className="text-sm font-medium text-gray-300 pt-2">Guardian / Contact Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Guardian Name">
          <input value={form.circumstances.guardianName} onChange={(e) => updateCircumstances('guardianName', e.target.value)} placeholder="Guardian name" className={input} />
        </Field>
        <Field label="Relationship">
          <input value={form.circumstances.guardianRelation} onChange={(e) => updateCircumstances('guardianRelation', e.target.value)} placeholder="e.g., Parent, Sibling" className={input} />
        </Field>
        <Field label="Contact Number *" error={errors.guardianPhone}>
          <input value={form.circumstances.guardianPhone} onChange={(e) => updateCircumstances('guardianPhone', e.target.value)} placeholder="Phone number" className={input} />
        </Field>
        <Field label="Secondary Contact">
          <input value={form.circumstances.secondaryContact} onChange={(e) => updateCircumstances('secondaryContact', e.target.value)} placeholder="Alternate phone" className={input} />
        </Field>
      </div>
      <Field label="Additional Notes">
        <textarea value={form.circumstances.additionalNotes} onChange={(e) => updateCircumstances('additionalNotes', e.target.value)} rows={2} placeholder="Any additional details..." className={`${input} resize-none`} />
      </Field>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Photos</h2>
      <p className="text-xs text-gray-500">Upload a clear frontal photo. Face embeddings will be auto-generated for AI matching.</p>

      {/* primary */}
      <Field label="Primary Photo *" error={errors.primaryPhoto}>
        {form.photos.primaryPhotoPreview ? (
          <div className="relative inline-block">
            <img src={form.photos.primaryPhotoPreview} alt="Primary" className="w-40 h-48 rounded-xl object-cover ring-1 ring-white/10" />
            <button
              onClick={() => setForm((p) => ({ ...p, photos: { ...p.photos, primaryPhoto: null, primaryPhotoPreview: '' } }))}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#ff3b3b] flex items-center justify-center text-white"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-40 h-48 rounded-xl border-2 border-dashed border-white/10 hover:border-[#00f5ff]/30 cursor-pointer transition-colors bg-[#0a1628]/50">
            <Upload size={24} className="text-gray-500 mb-2" />
            <span className="text-xs text-gray-500">Upload Photo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePrimaryPhoto} />
          </label>
        )}
      </Field>

      {/* additional */}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Additional Photos</label>
        <div className="flex flex-wrap gap-3">
          {form.photos.additionalPreviews.map((preview, idx) => (
            <div key={idx} className="relative">
              <img src={preview} alt={`Additional ${idx + 1}`} className="w-24 h-28 rounded-xl object-cover ring-1 ring-white/10" />
              <button
                onClick={() => removeAdditionalPhoto(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#ff3b3b] flex items-center justify-center text-white"
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center w-24 h-28 rounded-xl border-2 border-dashed border-white/10 hover:border-[#00f5ff]/30 cursor-pointer transition-colors bg-[#0a1628]/50">
            <Upload size={18} className="text-gray-500 mb-1" />
            <span className="text-[10px] text-gray-500">Add</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalPhotos} />
          </label>
        </div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Case Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="FIR Number *" error={errors.firNumber}>
          <input value={form.caseDetails.firNumber} onChange={(e) => updateCaseDetails('firNumber', e.target.value)} placeholder="FIR Number" className={input} />
        </Field>
        <Field label="Police Station *" error={errors.policeStation}>
          <input value={form.caseDetails.policeStation} onChange={(e) => updateCaseDetails('policeStation', e.target.value)} placeholder="Police station name" className={input} />
        </Field>
        <Field label="District">
          <input value={form.caseDetails.district} onChange={(e) => updateCaseDetails('district', e.target.value)} placeholder="District" className={input} />
        </Field>
        <Field label="Priority Level">
          <select value={form.caseDetails.priority} onChange={(e) => updateCaseDetails('priority', e.target.value)} className={input}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="Assigned Officer">
          <input value={form.caseDetails.assignedOfficer} onChange={(e) => updateCaseDetails('assignedOfficer', e.target.value)} placeholder="Officer name" className={input} />
        </Field>
      </div>
      <Field label="Case Notes">
        <textarea value={form.caseDetails.caseNotes} onChange={(e) => updateCaseDetails('caseNotes', e.target.value)} rows={3} placeholder="Additional notes..." className={`${input} resize-none`} />
      </Field>
    </motion.div>
  );

  const renderStep4 = () => {
    const fullName = `${form.person.firstName} ${form.person.lastName}`;
    return (
      <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
        <h2 className="text-lg font-semibold text-white mb-2">Review & Submit</h2>

        {/* person summary */}
        <div className={`${CARD_BG} rounded-xl p-4 space-y-2`}>
          <h3 className="text-xs font-semibold uppercase text-gray-400">Person Details</h3>
          <div className="flex items-start gap-4">
            {form.photos.primaryPhotoPreview && (
              <img src={form.photos.primaryPhotoPreview} alt="" className="w-16 h-20 rounded-lg object-cover ring-1 ring-white/10" />
            )}
            <div className="text-sm space-y-1">
              <p className="text-white font-medium">{fullName}</p>
              <p className="text-gray-400">{form.person.age} yrs, {form.person.gender}</p>
              <p className="text-gray-500">{form.person.height} {form.person.weight && `/ ${form.person.weight}`}</p>
              {form.person.medicalConditions && (
                <p className="text-[#ff3b3b] text-xs">Medical: {form.person.medicalConditions}</p>
              )}
            </div>
          </div>
        </div>

        {/* circumstances summary */}
        <div className={`${CARD_BG} rounded-xl p-4 space-y-2`}>
          <h3 className="text-xs font-semibold uppercase text-gray-400">Last Seen</h3>
          <p className="text-sm text-gray-200">
            {form.circumstances.lastSeenDate} at {form.circumstances.lastSeenTime}
          </p>
          {form.circumstances.lastSeenAddress && (
            <p className="text-sm text-gray-400">{form.circumstances.lastSeenAddress}</p>
          )}
          {form.circumstances.clothingDescription && (
            <p className="text-xs text-gray-500">Clothing: {form.circumstances.clothingDescription}</p>
          )}
        </div>

        {/* case summary */}
        <div className={`${CARD_BG} rounded-xl p-4 space-y-2`}>
          <h3 className="text-xs font-semibold uppercase text-gray-400">Case Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">FIR: </span>
              <span className="text-gray-200">{form.caseDetails.firNumber}</span>
            </div>
            <div>
              <span className="text-gray-500">Station: </span>
              <span className="text-gray-200">{form.caseDetails.policeStation}</span>
            </div>
            <div>
              <span className="text-gray-500">Priority: </span>
              <span className="text-gray-200 capitalize">{form.caseDetails.priority}</span>
            </div>
            {form.caseDetails.assignedOfficer && (
              <div>
                <span className="text-gray-500">Officer: </span>
                <span className="text-gray-200">{form.caseDetails.assignedOfficer}</span>
              </div>
            )}
          </div>
        </div>

        {/* photos count */}
        <div className={`${CARD_BG} rounded-xl p-4`}>
          <p className="text-sm text-gray-400">
            {form.photos.primaryPhoto ? '1 primary' : '0 primary'} + {form.photos.additionalPhotos.length} additional photos
          </p>
        </div>
      </motion.div>
    );
  };

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  /* ---------- render ---------- */
  return (
    <div className="p-4 md:p-6 min-h-screen">
      <button
        onClick={() => navigate('/dashboard/cases')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#00f5ff] transition-colors mb-4"
      >
        <ChevronLeft size={14} /> Back to Cases
      </button>

      <h1 className="text-2xl font-bold text-white mb-6">Create New Case</h1>

      {/* step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <React.Fragment key={s.label}>
              <button
                onClick={() => { if (done) setStep(i as Step); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30'
                    : done
                    ? 'text-[#00ff88] border border-transparent cursor-pointer'
                    : 'text-gray-600 border border-transparent'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  done ? 'bg-[#00ff88]/20 text-[#00ff88]' : active ? 'bg-[#00f5ff]/20 text-[#00f5ff]' : 'bg-white/5 text-gray-600'
                }`}>
                  {done ? <Check size={12} /> : i + 1}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px flex-shrink-0 ${done ? 'bg-[#00ff88]/30' : 'bg-white/5'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* form body */}
      <div className={`${CARD_BG} rounded-2xl p-6 max-w-3xl`}>
        <AnimatePresence mode="wait">
          {stepContent[step]()}
        </AnimatePresence>

        {/* navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/5">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0a1628] border border-white/10 text-sm text-gray-300 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-sm text-[#00f5ff] hover:bg-[#00f5ff]/25 transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#00ff88]/15 border border-[#00ff88]/30 text-sm text-[#00ff88] hover:bg-[#00ff88]/25 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#00ff88]/30 border-t-[#00ff88] rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={14} /> Submit Case
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCasePage;
