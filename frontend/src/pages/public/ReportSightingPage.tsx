import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Search,
  User,
  FileImage,
  Video,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ChevronRight,
  Navigation,
  Loader2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MissingPersonOption {
  id: string;
  name: string;
  age: number;
  photoUrl: string;
  lastSeenLocation: string;
  caseId: string;
}

interface UploadedFile {
  file: File;
  previewUrl: string;
  type: "image" | "video";
}

interface SightingFormData {
  selectedPersonId: string | null;
  files: UploadedFile[];
  location: { lat: number; lng: number; address: string } | null;
  notes: string;
  sightingDate: string;
  sightingTime: string;
  isAnonymous: boolean;
  contactInfo: string;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  timestamp: string;
}

type WizardStep = 1 | 2 | 3 | "success";

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_PERSONS: MissingPersonOption[] = [
  {
    id: "1",
    name: "Sarah Mitchell",
    age: 24,
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    lastSeenLocation: "Downtown Chicago, IL",
    caseId: "MPD-2026-00847",
  },
  {
    id: "2",
    name: "James Rodriguez",
    age: 17,
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    lastSeenLocation: "Miami Beach, FL",
    caseId: "MPD-2026-00831",
  },
  {
    id: "3",
    name: "Emily Chen",
    age: 8,
    photoUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=100&h=100&fit=crop",
    lastSeenLocation: "San Francisco, CA",
    caseId: "MPD-2026-00839",
  },
  {
    id: "4",
    name: "David Okafor",
    age: 45,
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    lastSeenLocation: "Houston, TX",
    caseId: "MPD-2026-00812",
  },
  {
    id: "6",
    name: "Tyler Washington",
    age: 14,
    photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop",
    lastSeenLocation: "Atlanta, GA",
    caseId: "MPD-2026-00855",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDeviceInfo(): DeviceInfo {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timestamp: new Date().toISOString(),
  };
}

function generateReferenceNumber(): string {
  const prefix = "SIGHT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Step Indicator ─────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: WizardStep;
}

const STEP_LABELS = ["Select Person", "Add Evidence", "Review & Submit"];

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const stepNum = typeof currentStep === "number" ? currentStep : 3;

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {[1, 2, 3].map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                step < stepNum
                  ? "bg-blue-600 border-blue-600 text-white"
                  : step === stepNum
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : "border-white/20 text-gray-600 bg-transparent"
              }`}
            >
              {step < stepNum ? <Check className="w-5 h-5" /> : step}
            </div>
            <span
              className={`text-xs mt-2 hidden sm:block ${
                step <= stepNum ? "text-blue-400" : "text-gray-600"
              }`}
            >
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < 2 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 transition-colors ${
                step < stepNum ? "bg-blue-600" : "bg-white/10"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ─── Image Upload Dropzone ──────────────────────────────────────────────────

interface ImageUploadProps {
  files: UploadedFile[];
  onFilesAdded: (files: UploadedFile[]) => void;
  onFileRemove: (index: number) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ files, onFilesAdded, onFileRemove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: UploadedFile[] = [];
      Array.from(fileList).forEach((file) => {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          newFiles.push({
            file,
            previewUrl: URL.createObjectURL(file),
            type: file.type.startsWith("image/") ? "image" : "video",
          });
        }
      });
      if (newFiles.length > 0) {
        onFilesAdded(newFiles);
      }
    },
    [onFilesAdded]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-white/20 bg-white/5 hover:border-blue-500/40 hover:bg-white/10"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
        <p className="text-white font-medium mb-1">Drag and drop photos or videos here</p>
        <p className="text-sm text-gray-400">or click to browse. Max 10MB per file.</p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <FileImage className="w-3 h-3" /> JPG, PNG, WEBP
          </span>
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3" /> MP4, MOV
          </span>
        </div>
      </div>

      {/* Preview */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {files.map((f, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10">
              {f.type === "image" ? (
                <img
                  src={f.previewUrl}
                  alt={`Upload ${i + 1}`}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <video
                  src={f.previewUrl}
                  className="w-full aspect-square object-cover"
                  muted
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove(i);
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-xs text-gray-300 truncate">
                  {f.file.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Map Location Picker (placeholder) ──────────────────────────────────────

interface MapPickerProps {
  location: { lat: number; lng: number; address: string } | null;
  onLocationChange: (loc: { lat: number; lng: number; address: string }) => void;
}

const MapLocationPicker: React.FC<MapPickerProps> = ({ location, onLocationChange }) => {
  const [addressInput, setAddressInput] = useState(location?.address || "");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: addressInput || `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddressSubmit = () => {
    if (addressInput.trim()) {
      onLocationChange({
        lat: location?.lat || 40.7128,
        lng: location?.lng || -74.006,
        address: addressInput.trim(),
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddressSubmit()}
            placeholder="Enter address or location..."
            className="w-full py-3 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {isGettingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">GPS</span>
        </button>
      </div>

      {/* Map placeholder */}
      <div className="aspect-video bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-600">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Location Picker</p>
          {location && (
            <p className="text-xs mt-1">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
          <p className="text-xs mt-1">(Integrate MapComponent)</p>
        </div>
      </div>

      {location && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Location set: {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const ReportSightingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [personSearch, setPersonSearch] = useState("");
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");

  const [form, setForm] = useState<SightingFormData>({
    selectedPersonId: searchParams.get("person") || null,
    files: [],
    location: null,
    notes: "",
    sightingDate: "",
    sightingTime: "",
    isAnonymous: true,
    contactInfo: "",
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pre-select person if provided in URL
  useEffect(() => {
    const personId = searchParams.get("person");
    if (personId) {
      setForm((prev) => ({ ...prev, selectedPersonId: personId }));
      const person = MOCK_PERSONS.find((p) => p.id === personId);
      if (person) setPersonSearch(person.name);
    }
  }, [searchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPersonDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedPerson = MOCK_PERSONS.find((p) => p.id === form.selectedPersonId);

  const filteredPersons = MOCK_PERSONS.filter((p) =>
    p.name.toLowerCase().includes(personSearch.toLowerCase()) ||
    p.caseId.toLowerCase().includes(personSearch.toLowerCase())
  );

  const handleSelectPerson = (person: MissingPersonOption) => {
    setForm((prev) => ({ ...prev, selectedPersonId: person.id }));
    setPersonSearch(person.name);
    setShowPersonDropdown(false);
  };

  const handleFilesAdded = (newFiles: UploadedFile[]) => {
    setForm((prev) => ({
      ...prev,
      files: [...prev.files, ...newFiles].slice(0, 5),
    }));
  };

  const handleFileRemove = (index: number) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const canProceedStep1 = !!form.selectedPersonId;
  const canProceedStep2 = form.files.length > 0 || !!form.location;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const deviceInfo = getDeviceInfo();

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setReferenceNumber(generateReferenceNumber());
    setIsSubmitting(false);
    setCurrentStep("success");
  };

  // ── Success page ──────────────────────────────────────────────────────

  if (currentStep === "success") {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center px-4">
        <motion.div
          className="max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-10">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Report Submitted</h1>
            <p className="text-gray-400 mb-6">
              Thank you for your report. Your information has been forwarded to the
              investigation team.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-1">Reference Number</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-mono font-bold text-blue-400">
                  {referenceNumber}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(referenceNumber)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copy reference number"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-8">
              Save this reference number to track the status of your report.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => navigator.clipboard.writeText(referenceNumber)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
              >
                Copy Reference Number
              </button>
              <Link
                to="/"
                className="block w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors text-center"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main wizard ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0d1f3c] to-[#0a1628] border-b border-white/5 pt-24 pb-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">Report a Sighting</span>
          </nav>
          <motion.h1
            className="text-3xl sm:text-4xl font-bold mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Report a Sighting
          </motion.h1>
          <motion.p
            className="text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Provide details about a potential sighting. All information is kept confidential.
          </motion.p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <StepIndicator currentStep={currentStep} />

        <AnimatePresence mode="wait">
          {/* ── Step 1: Select Person ─────────────────────────────────── */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-2">Select Missing Person</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Search for the missing person you believe you have seen.
                </p>

                <div className="relative" ref={dropdownRef}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={personSearch}
                    onChange={(e) => {
                      setPersonSearch(e.target.value);
                      setShowPersonDropdown(true);
                      if (!e.target.value) {
                        setForm((prev) => ({ ...prev, selectedPersonId: null }));
                      }
                    }}
                    onFocus={() => setShowPersonDropdown(true)}
                    placeholder="Search by name or case ID..."
                    className="w-full py-3 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />

                  <AnimatePresence>
                    {showPersonDropdown && personSearch && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-[#0f2240] border border-white/10 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto"
                      >
                        {filteredPersons.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No results found. Try a different search.
                          </div>
                        ) : (
                          filteredPersons.map((person) => (
                            <button
                              key={person.id}
                              onClick={() => handleSelectPerson(person)}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left ${
                                form.selectedPersonId === person.id ? "bg-blue-500/10" : ""
                              }`}
                            >
                              <img
                                src={person.photoUrl}
                                alt={person.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {person.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Age {person.age} &middot; {person.lastSeenLocation}
                                </p>
                              </div>
                              <span className="text-xs text-gray-600 font-mono">
                                {person.caseId}
                              </span>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selected person preview */}
                {selectedPerson && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                  >
                    <img
                      src={selectedPerson.photoUrl}
                      alt={selectedPerson.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <div>
                      <p className="font-semibold text-white">{selectedPerson.name}</p>
                      <p className="text-sm text-gray-400">
                        Age {selectedPerson.age} &middot; {selectedPerson.lastSeenLocation}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">{selectedPerson.caseId}</p>
                    </div>
                    <button
                      onClick={() => {
                        setForm((prev) => ({ ...prev, selectedPersonId: null }));
                        setPersonSearch("");
                      }}
                      className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedStep1}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Add Evidence ─────────────────────────────────── */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 space-y-8">
                {/* Photo/Video upload */}
                <div>
                  <h2 className="text-xl font-bold mb-2">Upload Evidence</h2>
                  <p className="text-sm text-gray-400 mb-4">
                    Upload photos or videos of the sighting. At least one file or a location is required.
                  </p>
                  <ImageUpload
                    files={form.files}
                    onFilesAdded={handleFilesAdded}
                    onFileRemove={handleFileRemove}
                  />
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Location</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Where did you see this person? Use GPS or enter the address manually.
                  </p>
                  <MapLocationPicker
                    location={form.location}
                    onLocationChange={(loc) =>
                      setForm((prev) => ({ ...prev, location: loc }))
                    }
                  />
                </div>

                {/* Date & time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Date of sighting</label>
                    <input
                      type="date"
                      value={form.sightingDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sightingDate: e.target.value }))
                      }
                      className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Time of sighting</label>
                    <input
                      type="time"
                      value={form.sightingTime}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sightingTime: e.target.value }))
                      }
                      className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Additional notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={4}
                    placeholder="Describe what you saw, what the person was wearing, their behavior, direction of travel..."
                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedStep2}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Review & Submit ──────────────────────────────── */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
                <h2 className="text-xl font-bold mb-2">Review & Submit</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Please review your information before submitting.
                </p>

                {/* Selected person */}
                <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                  {selectedPerson && (
                    <img
                      src={selectedPerson.photoUrl}
                      alt={selectedPerson.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-white">
                      {selectedPerson?.name || "No person selected"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {selectedPerson && `Case ${selectedPerson.caseId}`}
                    </p>
                  </div>
                </div>

                {/* Files */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Uploaded Files ({form.files.length})
                  </h3>
                  {form.files.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {form.files.map((f, i) => (
                        <div
                          key={i}
                          className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 flex-shrink-0"
                        >
                          <img
                            src={f.previewUrl}
                            alt={f.file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No files uploaded</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Location</h3>
                  {form.location ? (
                    <div className="flex items-center gap-2 text-sm text-white">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      {form.location.address || `${form.location.lat.toFixed(4)}, ${form.location.lng.toFixed(4)}`}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No location provided</p>
                  )}
                </div>

                {/* Date/time */}
                {(form.sightingDate || form.sightingTime) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">When</h3>
                    <p className="text-sm text-white">
                      {form.sightingDate &&
                        new Date(form.sightingDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      {form.sightingDate && form.sightingTime && " at "}
                      {form.sightingTime}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {form.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Notes</h3>
                    <p className="text-sm text-gray-300">{form.notes}</p>
                  </div>
                )}

                {/* Anonymous option */}
                <div className="border-t border-white/10 pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="anonymous-submit"
                      checked={form.isAnonymous}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, isAnonymous: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="anonymous-submit" className="text-sm text-gray-300">
                      Submit anonymously
                    </label>
                  </div>

                  {!form.isAnonymous && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Contact information (optional)
                      </label>
                      <input
                        type="text"
                        value={form.contactInfo}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, contactInfo: e.target.value }))
                        }
                        placeholder="Email or phone for follow-up..."
                        className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReportSightingPage;
