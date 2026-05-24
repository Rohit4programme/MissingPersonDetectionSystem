import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Edit, XCircle, UserCheck, Upload, Clock, Camera, MapPin,
  AlertTriangle, ChevronRight, FileText, Image as ImageIcon, Video,
  ArrowLeft, Eye,
} from 'lucide-react';

/* ---------- shared ---------- */
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import FaceMatchCard from '../../components/common/FaceMatchCard';
import Skeleton from '../../components/common/Skeleton';
import { useCaseStore } from '../../stores/caseStore';
import { useDetectionStore } from '../../stores/detectionStore';

/* ---------- types ---------- */
interface PersonInfo {
  photo: string;
  name: string;
  age: number;
  gender: string;
  height: string;
  weight: string;
  description: string;
  medicalConditions: string[];
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'detection' | 'sighting' | 'status_change' | 'assignment' | 'evidence';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

interface EvidenceItem {
  id: string;
  type: 'photo' | 'video' | 'document';
  url: string;
  name: string;
  uploadedAt: string;
}

interface DetectionRow {
  id: string;
  capturedPhoto: string;
  confidence: number;
  cameraName: string;
  location: string;
  timestamp: string;
  verified: boolean | null;
}

interface SightingReport {
  id: string;
  reporterName: string;
  location: string;
  timestamp: string;
  description: string;
  photo?: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface LocationPoint {
  lat: number;
  lng: number;
  label: string;
}

interface FaceMatchResult {
  id: string;
  personName: string;
  personPhoto: string;
  capturedPhoto: string;
  confidence: number;
  timestamp: string;
  cameraName: string;
}

interface CaseDetail {
  id: string;
  caseNumber: string;
  status: 'active' | 'resolved' | 'pending' | 'closed';
  priority: 'high' | 'medium' | 'low';
  person: PersonInfo;
  timeline: TimelineEvent[];
  evidence: EvidenceItem[];
  detections: DetectionRow[];
  sightings: SightingReport[];
  lastSeenLocation: LocationPoint;
  detectionLocations: LocationPoint[];
  faceMatches: FaceMatchResult[];
  assignedOfficer: {
    name: string;
    badge: string;
    phone: string;
    photo: string;
  };
}

type Tab = 'overview' | 'detections' | 'sightings' | 'evidence' | 'timeline';

/* ---------- constants ---------- */
const CARD_BG = 'bg-[#1a2744]/80 backdrop-blur-md border border-white/5';
const NEON_CYAN = '#00f5ff';
const NEON_GREEN = '#00ff88';
const NEON_RED = '#ff3b3b';

const markerIcon = (color: string) =>
  new L.Icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="10" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="2"/></svg>`,
      ),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'detections', label: 'Detections' },
  { key: 'sightings', label: 'Sightings' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'timeline', label: 'Timeline' },
];

/* ========== PAGE ========== */
const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentCase, loading, fetchCaseById, updateCaseStatus, assignOfficer } = useCaseStore();
  const { detections, fetchDetections } = useDetectionStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const c = currentCase as CaseDetail | null;

  useEffect(() => {
    if (id) fetchCaseById(id);
  }, [id, fetchCaseById]);

  /* loading */
  if (loading && !c) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Skeleton className="h-[500px] rounded-2xl lg:col-span-3" />
          <Skeleton className="h-[500px] rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!c) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <AlertTriangle size={40} className="mb-3 opacity-30" />
        <p>Case not found.</p>
        <button onClick={() => navigate('/dashboard/cases')} className="mt-3 text-[#00f5ff] text-sm hover:underline">
          Back to Cases
        </button>
      </div>
    );
  }

  /* ---------- sub-renders ---------- */
  const renderPersonInfo = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Person Information</h3>
      <div className="flex gap-4">
        <img
          src={c.person.photo}
          alt={c.person.name}
          className="w-24 h-28 rounded-xl object-cover ring-1 ring-white/10 flex-shrink-0"
        />
        <div className="space-y-1.5 text-sm min-w-0">
          <p className="text-white font-semibold text-lg">{c.person.name}</p>
          <p className="text-gray-400">
            {c.person.age} yrs &middot; {c.person.gender}
          </p>
          <p className="text-gray-400">
            {c.person.height} &middot; {c.person.weight}
          </p>
          <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{c.person.description}</p>
          {c.person.medicalConditions.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {c.person.medicalConditions.map((mc) => (
                <span
                  key={mc}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff3b3b]/10 text-[#ff3b3b] border border-[#ff3b3b]/20"
                >
                  {mc}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Case Timeline</h3>
      <div className="relative pl-5 space-y-4 max-h-72 overflow-y-auto custom-scrollbar">
        <div className="absolute left-1.5 top-1 bottom-1 w-px bg-white/10" />
        {c.timeline.map((ev) => (
          <div key={ev.id} className="relative">
            <div className="absolute -left-[13px] top-0.5 w-5 h-5 rounded-full bg-[#1a2744] border-2 border-[#00f5ff] flex items-center justify-center">
              <span className="text-[8px] text-[#00f5ff]">{/* icon */}!</span>
            </div>
            <p className="text-xs text-white font-medium">{ev.title}</p>
            <p className="text-[11px] text-gray-500">{ev.description}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{ev.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEvidence = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Evidence Gallery</h3>
        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a1628] border border-white/10 text-xs text-gray-300 hover:text-[#00f5ff] cursor-pointer transition-colors">
          <Upload size={12} /> Upload
          <input type="file" multiple className="hidden" onChange={() => setUploadingEvidence(true)} />
        </label>
      </div>
      {c.evidence.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
          No evidence uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {c.evidence.map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-xl overflow-hidden group aspect-square bg-[#0a1628]"
            >
              {ev.type === 'photo' ? (
                <img src={ev.url} alt={ev.name} className="w-full h-full object-cover" />
              ) : ev.type === 'video' ? (
                <div className="flex items-center justify-center w-full h-full">
                  <Video size={28} className="text-gray-500" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <FileText size={28} className="text-gray-500" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <p className="text-[10px] text-white truncate">{ev.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetectionHistory = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Detection History</h3>
      {c.detections.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-8">No detections recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 uppercase">
                <th className="pb-2">Photo</th>
                <th className="pb-2">Confidence</th>
                <th className="pb-2">Camera</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Time</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {c.detections.map((d) => (
                <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2">
                    <img src={d.capturedPhoto} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  </td>
                  <td className="py-2">
                    <span
                      className="font-mono"
                      style={{ color: d.confidence >= 85 ? NEON_GREEN : d.confidence >= 70 ? '#ffaa00' : NEON_RED }}
                    >
                      {d.confidence}%
                    </span>
                  </td>
                  <td className="py-2 text-gray-400">{d.cameraName}</td>
                  <td className="py-2 text-gray-400">{d.location}</td>
                  <td className="py-2 text-gray-500">{d.timestamp}</td>
                  <td className="py-2">
                    {d.verified === true && <span className="text-[#00ff88]">Verified</span>}
                    {d.verified === false && <span className="text-[#ff3b3b]">Rejected</span>}
                    {d.verified === null && <span className="text-gray-500">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderMap = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Location Map</h3>
      <div className="h-64 rounded-xl overflow-hidden">
        <MapContainer
          center={[c.lastSeenLocation.lat, c.lastSeenLocation.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {/* last seen */}
          <Marker position={[c.lastSeenLocation.lat, c.lastSeenLocation.lng]} icon={markerIcon(NEON_RED)}>
            <Popup>Last seen: {c.lastSeenLocation.label}</Popup>
          </Marker>
          {/* detections */}
          {c.detectionLocations.map((loc, i) => (
            <Marker key={i} position={[loc.lat, loc.lng]} icon={markerIcon(NEON_CYAN)}>
              <Popup>Detection: {loc.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );

  const renderFaceMatches = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">AI Face Matches</h3>
      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
        {c.faceMatches.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">No face matches found.</p>
        ) : (
          c.faceMatches.map((fm) => (
            <FaceMatchCard
              key={fm.id}
              personName={fm.personName}
              personPhoto={fm.personPhoto}
              capturedPhoto={fm.capturedPhoto}
              confidence={fm.confidence}
              timestamp={fm.timestamp}
              cameraName={fm.cameraName}
            />
          ))
        )}
      </div>
    </div>
  );

  const renderAssignedOfficer = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Assigned Officer</h3>
      <div className="flex items-center gap-3">
        <img
          src={c.assignedOfficer.photo}
          alt={c.assignedOfficer.name}
          className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/10"
        />
        <div className="text-sm">
          <p className="text-white font-medium">{c.assignedOfficer.name}</p>
          <p className="text-gray-500 text-xs">Badge: {c.assignedOfficer.badge}</p>
          <p className="text-gray-500 text-xs">{c.assignedOfficer.phone}</p>
        </div>
      </div>
    </div>
  );

  const renderSightingReports = () => (
    <div className={`${CARD_BG} rounded-2xl p-5`}>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Sighting Reports</h3>
      <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar">
        {c.sightings.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">No sighting reports.</p>
        ) : (
          c.sightings.map((s) => (
            <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#0a1628]/60">
              {s.photo && (
                <img src={s.photo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 text-xs">
                <p className="text-white font-medium">{s.reporterName}</p>
                <p className="text-gray-500 flex items-center gap-1">
                  <MapPin size={10} /> {s.location}
                </p>
                <p className="text-gray-600 flex items-center gap-1 mt-0.5">
                  <Clock size={10} /> {s.timestamp}
                </p>
                <p className="text-gray-400 mt-1 line-clamp-2">{s.description}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  /* tab content */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-4"
          >
            {/* left */}
            <div className="lg:col-span-3 space-y-4">
              {renderPersonInfo()}
              {renderTimeline()}
              {renderEvidence()}
              {renderDetectionHistory()}
            </div>
            {/* right */}
            <div className="lg:col-span-2 space-y-4">
              {renderMap()}
              {renderFaceMatches()}
              {renderAssignedOfficer()}
              {renderSightingReports()}
            </div>
          </motion.div>
        );
      case 'detections':
        return (
          <motion.div key="detections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderDetectionHistory()}
          </motion.div>
        );
      case 'sightings':
        return (
          <motion.div key="sightings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderSightingReports()}
          </motion.div>
        );
      case 'evidence':
        return (
          <motion.div key="evidence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderEvidence()}
          </motion.div>
        );
      case 'timeline':
        return (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderTimeline()}
          </motion.div>
        );
    }
  };

  /* ---------- main render ---------- */
  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      {/* back */}
      <button
        onClick={() => navigate('/dashboard/cases')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#00f5ff] transition-colors"
      >
        <ArrowLeft size={14} /> Back to Cases
      </button>

      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white font-mono">{c.caseNumber}</h1>
          <StatusBadge status={c.status} />
          <PriorityBadge priority={c.priority} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/dashboard/cases/${id}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2744] border border-white/10 text-xs text-gray-300 hover:text-[#00f5ff] transition-colors"
          >
            <Edit size={13} /> Edit
          </button>
          <button
            onClick={() => updateCaseStatus(id!, 'closed')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2744] border border-white/10 text-xs text-gray-300 hover:text-[#ff3b3b] transition-colors"
          >
            <XCircle size={13} /> Close Case
          </button>
          <button
            onClick={() => {/* open assign modal */}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-xs text-[#00f5ff] hover:bg-[#00f5ff]/25 transition-colors"
          >
            <UserCheck size={13} /> Assign
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#00f5ff]/15 text-[#00f5ff] border border-[#00f5ff]/30'
                : 'text-gray-500 hover:text-gray-300 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* content */}
      <AnimatePresence mode="wait">{renderTabContent()}</AnimatePresence>
    </div>
  );
};

export default CaseDetailPage;
