import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  User,
  Ruler,
  Weight,
  Eye,
  AlertTriangle,
  Camera,
  Share2,
  QrCode,
  ExternalLink,
  Clock,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Activity,
  Shield,
  Copy,
  MessageCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MissingPersonDetail {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  photoUrl: string;
  posterUrl: string;
  height: string;
  weight: string;
  eyeColor: string;
  hairColor: string;
  description: string;
  distinguishingFeatures: string[];
  lastSeenLocation: string;
  lastSeenLat: number;
  lastSeenLng: number;
  lastSeenDate: string;
  lastSeenTime: string;
  status: "missing" | "found" | "critical";
  caseId: string;
  reportedDate: string;
  reportedBy: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  type: "reported" | "sighting" | "update" | "found";
  description: string;
  location?: string;
}

interface DetectionEvent {
  id: string;
  date: string;
  time: string;
  location: string;
  confidence: number;
  imageUrl: string;
  cameraId: string;
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_PERSON: MissingPersonDetail = {
  id: "1",
  name: "Sarah Mitchell",
  age: 24,
  gender: "female",
  photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop",
  posterUrl: "",
  height: "5'6\" (168 cm)",
  weight: "135 lbs (61 kg)",
  eyeColor: "Hazel",
  hairColor: "Brown",
  description:
    "Sarah was last seen leaving her workplace in downtown Chicago on May 20, 2026, around 6:00 PM. She was wearing a navy blue jacket, black jeans, and white sneakers. She carries a brown leather tote bag and wears a silver watch on her left wrist.",
  distinguishingFeatures: [
    "Small scar above left eyebrow",
    "Birthmark on right forearm",
    "Wears silver ring on index finger",
  ],
  lastSeenLocation: "Downtown Chicago, IL",
  lastSeenLat: 41.8781,
  lastSeenLng: -87.6298,
  lastSeenDate: "2026-05-20",
  lastSeenTime: "6:00 PM",
  status: "critical",
  caseId: "MPD-2026-00847",
  reportedDate: "2026-05-20",
  reportedBy: "Family",
};

const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: "1",
    date: "2026-05-20",
    time: "8:30 PM",
    type: "reported",
    description: "Case reported by family after Sarah failed to return home from work.",
    location: "Chicago, IL",
  },
  {
    id: "2",
    date: "2026-05-21",
    time: "10:15 AM",
    type: "sighting",
    description: "Potential sighting reported near Millennium Park by a bystander.",
    location: "Millennium Park, Chicago",
  },
  {
    id: "3",
    date: "2026-05-21",
    time: "3:45 PM",
    type: "update",
    description: "CCTV footage reviewed. Last confirmed location: CTA Red Line station.",
    location: "Monroe CTA Station, Chicago",
  },
  {
    id: "4",
    date: "2026-05-22",
    time: "9:00 AM",
    type: "sighting",
    description: "AI detection match at O'Hare airport entrance. Confidence: 72%.",
    location: "O'Hare International Airport",
  },
];

const MOCK_DETECTIONS: DetectionEvent[] = [
  {
    id: "d1",
    date: "2026-05-22",
    time: "9:03 AM",
    location: "O'Hare Airport - Terminal 2 Entrance",
    confidence: 72,
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
    cameraId: "CAM-ORD-T2-014",
  },
  {
    id: "d2",
    date: "2026-05-21",
    time: "11:20 PM",
    location: "CTA Red Line - Monroe Station",
    confidence: 58,
    imageUrl: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=300&fit=crop",
    cameraId: "CAM-CTA-MON-003",
  },
  {
    id: "d3",
    date: "2026-05-21",
    time: "2:15 PM",
    location: "Millennium Park - Cloud Gate",
    confidence: 45,
    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=300&fit=crop",
    cameraId: "CAM-MP-CG-001",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  missing: {
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/30",
    label: "Missing",
  },
  critical: {
    bg: "bg-red-500/20",
    text: "text-red-300",
    border: "border-red-500/30",
    label: "Critical",
  },
  found: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-300",
    border: "border-emerald-500/30",
    label: "Found",
  },
};

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  reported: <AlertTriangle className="w-4 h-4" />,
  sighting: <Eye className="w-4 h-4" />,
  update: <Activity className="w-4 h-4" />,
  found: <CheckCircle2 className="w-4 h-4" />,
};

const TIMELINE_COLORS: Record<string, string> = {
  reported: "bg-red-500/20 text-red-400 border-red-500/30",
  sighting: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  update: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  found: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-emerald-400 bg-emerald-500/20";
  if (confidence >= 50) return "text-amber-400 bg-amber-500/20";
  return "text-red-400 bg-red-500/20";
}

// ─── Anonymous Report Form ──────────────────────────────────────────────────

interface ReportFormState {
  description: string;
  location: string;
  contactInfo: string;
  isAnonymous: boolean;
}

const AnonymousReportForm: React.FC<{ personName: string }> = ({ personName }) => {
  const [form, setForm] = useState<ReportFormState>({
    description: "",
    location: "",
    contactInfo: "",
    isAnonymous: true,
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit to backend
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-emerald-300 mb-2">Report Submitted</h3>
        <p className="text-gray-400">
          Thank you for your report. It will be reviewed by our team and law enforcement.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          What did you see? Describe the sighting in detail.
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          rows={4}
          placeholder={`Describe when and where you saw ${personName}...`}
          className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Where did you see them?
        </label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          required
          placeholder="Enter address or landmark..."
          className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="anonymous"
          checked={form.isAnonymous}
          onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })}
          className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="anonymous" className="text-sm text-gray-300">
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
            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
            placeholder="Email or phone number..."
            className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      )}

      <button
        type="submit"
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
      >
        Submit Report
      </button>
    </form>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const MissingPersonDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [person, setPerson] = useState<MissingPersonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    // Simulate API call
    const timer = setTimeout(() => {
      if (id) {
        setPerson(MOCK_PERSON);
      } else {
        setError("Person not found.");
      }
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading case details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !person) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading Case</h2>
          <p className="text-gray-400 mb-6">{error || "Person not found."}</p>
          <button
            onClick={() => navigate("/gallery")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[person.status];

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Breadcrumb */}
      <div className="pt-20 pb-4 px-4 sm:px-6 bg-gradient-to-b from-[#0d1f3c] to-[#0a1628]">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6" aria-label="Breadcrumb">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <ChevronRight className="w-4 h-4" />
            <Link to="/gallery" className="hover:text-white transition-colors">
              Gallery
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{person.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        {/* Top section: Photo + Details */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          {/* Left: Photo + Poster */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="sticky top-24 space-y-4">
              <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <img
                  src={person.photoUrl}
                  alt={person.name}
                  className="w-full aspect-[3/4] object-cover"
                />
                <span
                  className={`absolute top-4 right-4 px-4 py-1.5 text-sm font-semibold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  {statusStyle.label}
                </span>
              </div>

              {/* AI Generated Poster placeholder */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-400 mb-3">AI-Generated Missing Poster</p>
                <div className="aspect-[8/11] bg-gradient-to-br from-white/5 to-white/10 rounded-lg flex items-center justify-center border border-white/10">
                  <div className="text-center text-gray-600">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Poster Preview</p>
                  </div>
                </div>
                <button className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors">
                  Download Poster
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right: Details */}
          <motion.div
            className="lg:col-span-3 space-y-6"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl sm:text-4xl font-bold">{person.name}</h1>
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Share"
                  >
                    <Share2 className="w-5 h-5 text-gray-400" />
                  </button>
                  <AnimatePresence>
                    {showShareMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[#0f2240] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden"
                      >
                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                        >
                          {copiedLink ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copiedLink ? "Copied!" : "Copy Link"}
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                          <QrCode className="w-4 h-4" />
                          Show QR Code
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                          <Share2 className="w-4 h-4" />
                          Facebook
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                          <Share2 className="w-4 h-4" />
                          Twitter / X
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <p className="text-gray-400">
                Case ID: <span className="text-white font-mono">{person.caseId}</span>
              </p>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Age", value: `${person.age} years`, icon: <Calendar className="w-4 h-4" /> },
                { label: "Gender", value: person.gender.charAt(0).toUpperCase() + person.gender.slice(1), icon: <User className="w-4 h-4" /> },
                { label: "Height", value: person.height, icon: <Ruler className="w-4 h-4" /> },
                { label: "Weight", value: person.weight, icon: <Weight className="w-4 h-4" /> },
                { label: "Eyes", value: person.eyeColor, icon: <Eye className="w-4 h-4" /> },
                { label: "Hair", value: person.hairColor, icon: <User className="w-4 h-4" /> },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    {item.icon}
                    {item.label}
                  </div>
                  <div className="text-sm font-medium text-white">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{person.description}</p>
            </div>

            {/* Distinguishing features */}
            {person.distinguishingFeatures.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="font-semibold mb-3">Distinguishing Features</h3>
                <ul className="space-y-2">
                  {person.distinguishingFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Last seen location */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Last Seen Location</h3>
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-white font-medium">{person.lastSeenLocation}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(person.lastSeenDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at {person.lastSeenTime}
                  </p>
                </div>
              </div>
              {/* Map placeholder */}
              <div className="aspect-video bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Map View</p>
                  <p className="text-xs">
                    Lat: {person.lastSeenLat}, Lng: {person.lastSeenLng}
                  </p>
                  <p className="text-xs mt-1">(Integrate MapComponent)</p>
                </div>
              </div>
            </div>

            {/* Report a Sighting CTA */}
            <Link
              to={`/report-sighting?person=${person.id}`}
              className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-500/40"
            >
              <Camera className="w-5 h-5" />
              Report a Sighting
            </Link>
          </motion.div>
        </div>

        {/* Status Timeline */}
        <motion.section
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-6">Status Timeline</h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />

            <div className="space-y-6">
              {MOCK_TIMELINE.map((event, index) => (
                <motion.div
                  key={event.id}
                  className="relative flex gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center z-10 ${TIMELINE_COLORS[event.type]}`}
                  >
                    {TIMELINE_ICONS[event.type]}
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white capitalize">
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at {event.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{event.description}</p>
                    {event.location && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Detection Timeline */}
        <motion.section
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-2xl font-bold mb-6">Recent AI Detections</h2>
          <div className="space-y-4">
            {MOCK_DETECTIONS.map((detection, index) => (
              <motion.div
                key={detection.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              >
                <div className="sm:w-48 h-32 sm:h-auto overflow-hidden flex-shrink-0">
                  <img
                    src={detection.imageUrl}
                    alt={`Detection at ${detection.location}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {detection.location}
                    </span>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(
                        detection.confidence
                      )}`}
                    >
                      {detection.confidence}% match
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(detection.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at {detection.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Camera: {detection.cameraId}
                    </span>
                  </div>
                  {/* Confidence bar */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          detection.confidence >= 70
                            ? "bg-emerald-500"
                            : detection.confidence >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${detection.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Anonymous Report Form */}
        <motion.section
          id="report"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-2">Report a Sighting</h2>
            <p className="text-gray-400 mb-6">
              Have you seen {person.name}? Submit your report below. You can remain anonymous.
            </p>
            <AnonymousReportForm personName={person.name} />
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default MissingPersonDetail;
