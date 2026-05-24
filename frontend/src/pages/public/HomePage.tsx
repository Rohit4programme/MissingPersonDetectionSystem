import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Search,
  AlertTriangle,
  Users,
  MapPin,
  Camera,
  Cpu,
  Heart,
  Phone,
  Shield,
  ChevronRight,
  ArrowRight,
  Eye,
} from "lucide-react";

// ─── Animation wrappers ─────────────────────────────────────────────────────

interface AnimateOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const AnimateOnScroll: React.FC<AnimateOnScrollProps> = ({
  children,
  className = "",
  delay = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: string;
  icon: React.ReactNode;
}

interface MissingPersonCard {
  id: string;
  name: string;
  age: number;
  photoUrl: string;
  lastSeenLocation: string;
  lastSeenDate: string;
  status: "missing" | "found" | "critical";
}

interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface EmergencyContact {
  name: string;
  phone: string;
  description: string;
}

// ─── Mock data (replace with Zustand store calls) ───────────────────────────

const STATS: StatItem[] = [
  { label: "Active Cases", value: "2,847", icon: <AlertTriangle className="w-6 h-6" /> },
  { label: "Persons Found", value: "1,293", icon: <Heart className="w-6 h-6" /> },
  { label: "Reports Processed", value: "18,420", icon: <Eye className="w-6 h-6" /> },
  { label: "Cities Covered", value: "156", icon: <MapPin className="w-6 h-6" /> },
];

const RECENT_CASES: MissingPersonCard[] = [
  {
    id: "1",
    name: "Sarah Mitchell",
    age: 24,
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop",
    lastSeenLocation: "Downtown Chicago, IL",
    lastSeenDate: "2026-05-20",
    status: "critical",
  },
  {
    id: "2",
    name: "James Rodriguez",
    age: 17,
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
    lastSeenLocation: "Miami Beach, FL",
    lastSeenDate: "2026-05-18",
    status: "missing",
  },
  {
    id: "3",
    name: "Emily Chen",
    age: 8,
    photoUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&h=300&fit=crop",
    lastSeenLocation: "San Francisco, CA",
    lastSeenDate: "2026-05-19",
    status: "critical",
  },
  {
    id: "4",
    name: "David Okafor",
    age: 45,
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop",
    lastSeenLocation: "Houston, TX",
    lastSeenDate: "2026-05-15",
    status: "missing",
  },
];

const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: 1,
    title: "Report a Sighting",
    description:
      "Upload a photo or video, add the location where you saw someone who may be missing, and submit your report — anonymously if you prefer.",
    icon: <Camera className="w-10 h-10" />,
  },
  {
    step: 2,
    title: "AI Matches",
    description:
      "Our AI-powered facial recognition engine compares the sighting against active missing persons reports and identifies potential matches with confidence scores.",
    icon: <Cpu className="w-10 h-10" />,
  },
  {
    step: 3,
    title: "Person Found",
    description:
      "Verified matches are immediately forwarded to law enforcement and families. Every sighting brings someone closer to home.",
    icon: <Heart className="w-10 h-10" />,
  },
];

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: "National Emergency", phone: "911", description: "For immediate emergencies" },
  {
    name: "National Center for Missing Adults",
    phone: "1-800-690-FIND",
    description: "24/7 hotline for missing adults",
  },
  {
    name: "NCMEC Hotline",
    phone: "1-800-THE-LOST",
    description: "National Center for Missing & Exploited Children",
  },
  {
    name: "FBI Tips",
    phone: "1-800-CALL-FBI",
    description: "Report tips to the FBI",
  },
];

// ─── Status badge helper ────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  missing: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  found: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

// ─── Component ──────────────────────────────────────────────────────────────

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0f2240] to-[#0a1628]" />
        {/* Decorative radial glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-3xl" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/5 border border-white/10 text-sm text-blue-300">
              <Shield className="w-4 h-4" />
              AI-Powered Missing Person Detection
            </div>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Bringing{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Loved Ones
            </span>{" "}
            Home
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 30 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Use the power of AI and community reporting to help locate missing
            persons. Every report matters. Every sighting counts.
          </motion.p>

          {/* Search bar */}
          <motion.form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
              <Search className="absolute left-4 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, location, or case ID..."
                className="w-full py-4 pl-12 pr-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-base sm:text-lg"
              />
              <button
                type="submit"
                className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </motion.form>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link
              to="/report-sighting"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-500/40 hover:-translate-y-0.5"
            >
              <Camera className="w-5 h-5" />
              Report a Sighting
            </Link>
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <Users className="w-5 h-5" />
              View Missing Persons
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Banner ─────────────────────────────────────────────── */}
      <section className="relative py-16 bg-gradient-to-r from-[#0d1f3c] via-[#101d3a] to-[#0d1f3c] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, index) => (
              <AnimateOnScroll key={stat.label} delay={index * 0.1}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 mb-3">
                    {stat.icon}
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Missing Persons Gallery ───────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Recent Missing Persons
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                These individuals have been recently reported missing. If you
                have seen any of them, please report a sighting immediately.
              </p>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {RECENT_CASES.map((person, index) => (
              <AnimateOnScroll key={person.id} delay={index * 0.1}>
                <Link
                  to={`/missing-person/${person.id}`}
                  className="group block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={person.photoUrl}
                      alt={person.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span
                      className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full border ${
                        statusColors[person.status]
                      }`}
                    >
                      {person.status.charAt(0).toUpperCase() + person.status.slice(1)}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-lg font-bold text-white">
                        {person.name}
                      </h3>
                      <p className="text-sm text-gray-300">Age {person.age}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      {person.lastSeenLocation}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last seen:{" "}
                      {new Date(person.lastSeenDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </Link>
              </AnimateOnScroll>
            ))}
          </div>

          <AnimateOnScroll>
            <div className="text-center mt-10">
              <Link
                to="/gallery"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                View All Missing Persons
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628]">
        <div className="max-w-5xl mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Our platform combines community vigilance with cutting-edge AI to
                bring missing persons home faster than ever.
              </p>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, index) => (
              <AnimateOnScroll key={step.step} delay={index * 0.15}>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/30 transition-all duration-300 group">
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  {/* Connector line (hidden on last step, hidden on mobile) */}
                  {index < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden md:block absolute top-4 left-full w-full h-px bg-gradient-to-r from-blue-500/30 to-transparent" />
                  )}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 mb-6 group-hover:bg-blue-500/20 transition-colors">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── Emergency Contacts ───────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Emergency Contacts
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                If you believe someone is in immediate danger, please contact
                emergency services right away.
              </p>
            </div>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EMERGENCY_CONTACTS.map((contact, index) => (
              <AnimateOnScroll key={contact.name} delay={index * 0.1}>
                <a
                  href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                  className="flex items-center gap-4 p-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-300 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{contact.name}</h3>
                    <p className="text-sm text-gray-400">{contact.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-400 group-hover:text-red-300 transition-colors">
                      {contact.phone}
                    </span>
                  </div>
                </a>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <AnimateOnScroll>
            <div className="relative bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-cyan-600/20 backdrop-blur-sm border border-white/10 rounded-3xl p-10 sm:p-14 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Have You Seen Someone Missing?
                </h2>
                <p className="text-gray-400 max-w-lg mx-auto mb-8">
                  Your report could be the key to bringing someone home. Submit a
                  sighting with a photo and location — it only takes a minute.
                </p>
                <Link
                  to="/report-sighting"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                >
                  <Camera className="w-5 h-5" />
                  Report a Sighting Now
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
