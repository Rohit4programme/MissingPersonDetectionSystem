import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Grid3X3,
  List,
  MapPin,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  Calendar,
  User,
  SlidersHorizontal,
  AlertTriangle,
  Eye,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MissingPerson {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  photoUrl: string;
  lastSeenLocation: string;
  lastSeenLat: number;
  lastSeenLng: number;
  lastSeenDate: string;
  status: "missing" | "found" | "critical";
  description: string;
}

interface Filters {
  query: string;
  ageMin: string;
  ageMax: string;
  gender: string;
  location: string;
  status: string;
}

type ViewMode = "grid" | "list";
type SortBy = "relevance" | "date" | "name";

// ─── Constants ──────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;

const STATUS_COLORS: Record<string, string> = {
  missing: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  found: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const GENDER_OPTIONS = [
  { value: "", label: "All Genders" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "missing", label: "Missing" },
  { value: "critical", label: "Critical" },
  { value: "found", label: "Found" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Date Last Seen" },
  { value: "name", label: "Name (A-Z)" },
];

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_PERSONS: MissingPerson[] = [
  {
    id: "1",
    name: "Sarah Mitchell",
    age: 24,
    gender: "female",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop",
    lastSeenLocation: "Downtown Chicago, IL",
    lastSeenLat: 41.8781,
    lastSeenLng: -87.6298,
    lastSeenDate: "2026-05-20",
    status: "critical",
    description: "Last seen leaving workplace around 6 PM. Brown hair, hazel eyes, wearing a blue jacket.",
  },
  {
    id: "2",
    name: "James Rodriguez",
    age: 17,
    gender: "male",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
    lastSeenLocation: "Miami Beach, FL",
    lastSeenLat: 25.7907,
    lastSeenLng: -80.1300,
    lastSeenDate: "2026-05-18",
    status: "missing",
    description: "Last seen at South Beach near Ocean Drive. 5'10\", athletic build, dark curly hair.",
  },
  {
    id: "3",
    name: "Emily Chen",
    age: 8,
    gender: "female",
    photoUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&h=300&fit=crop",
    lastSeenLocation: "San Francisco, CA",
    lastSeenLat: 37.7749,
    lastSeenLng: -122.4194,
    lastSeenDate: "2026-05-19",
    status: "critical",
    description: "Last seen at Golden Gate Park. Small build, black hair, wearing a pink dress and white shoes.",
  },
  {
    id: "4",
    name: "David Okafor",
    age: 45,
    gender: "male",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop",
    lastSeenLocation: "Houston, TX",
    lastSeenLat: 29.7604,
    lastSeenLng: -95.3698,
    lastSeenDate: "2026-05-15",
    status: "missing",
    description: "Last seen at work. 6'1\", 200 lbs, black hair, brown eyes. Drives a silver Honda Accord.",
  },
  {
    id: "5",
    name: "Maria Santos",
    age: 32,
    gender: "female",
    photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop",
    lastSeenLocation: "Phoenix, AZ",
    lastSeenLat: 33.4484,
    lastSeenLng: -112.0740,
    lastSeenDate: "2026-05-17",
    status: "missing",
    description: "5'5\", medium build, long dark hair. Last seen at a grocery store near her home.",
  },
  {
    id: "6",
    name: "Tyler Washington",
    age: 14,
    gender: "male",
    photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop",
    lastSeenLocation: "Atlanta, GA",
    lastSeenLat: 33.7490,
    lastSeenLng: -84.3880,
    lastSeenDate: "2026-05-21",
    status: "critical",
    description: "Last seen walking home from school. 5'6\", slim, short black hair, wearing school uniform.",
  },
  {
    id: "7",
    name: "Linda Park",
    age: 67,
    gender: "female",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop",
    lastSeenLocation: "Seattle, WA",
    lastSeenLat: 47.6062,
    lastSeenLng: -122.3321,
    lastSeenDate: "2026-05-16",
    status: "missing",
    description: "Elderly woman, 5'2\", gray hair, last seen near Pike Place Market. May be disoriented.",
  },
  {
    id: "8",
    name: "Ahmed Hassan",
    age: 29,
    gender: "male",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop",
    lastSeenLocation: "Denver, CO",
    lastSeenLat: 39.7392,
    lastSeenLng: -104.9903,
    lastSeenDate: "2026-05-14",
    status: "missing",
    description: "5'11\", 180 lbs, dark hair, brown beard. Last seen at Denver International Airport.",
  },
  {
    id: "9",
    name: "Sophie Turner",
    age: 19,
    gender: "female",
    photoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop",
    lastSeenLocation: "Austin, TX",
    lastSeenLat: 30.2672,
    lastSeenLng: -97.7431,
    lastSeenDate: "2026-05-13",
    status: "found",
    description: "Found safe on May 20. Case resolved.",
  },
  {
    id: "10",
    name: "Robert Kim",
    age: 52,
    gender: "male",
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop",
    lastSeenLocation: "Portland, OR",
    lastSeenLat: 45.5152,
    lastSeenLng: -122.6784,
    lastSeenDate: "2026-05-12",
    status: "missing",
    description: "5'9\", 170 lbs, graying hair, wears glasses. Last seen near his home in the Pearl District.",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

const MissingPersonsGallery: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [persons] = useState<MissingPerson[]>(MOCK_PERSONS);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("date");

  const [filters, setFilters] = useState<Filters>({
    query: searchParams.get("q") || "",
    ageMin: "",
    ageMax: "",
    gender: "",
    location: "",
    status: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────

  const filteredPersons = useMemo(() => {
    let result = [...persons];

    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.lastSeenLocation.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (filters.ageMin) {
      result = result.filter((p) => p.age >= parseInt(filters.ageMin, 10));
    }
    if (filters.ageMax) {
      result = result.filter((p) => p.age <= parseInt(filters.ageMax, 10));
    }
    if (filters.gender) {
      result = result.filter((p) => p.gender === filters.gender);
    }
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter((p) =>
        p.lastSeenLocation.toLowerCase().includes(loc)
      );
    }
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }

    // Sort
    switch (sortBy) {
      case "date":
        result.sort(
          (a, b) =>
            new Date(b.lastSeenDate).getTime() -
            new Date(a.lastSeenDate).getTime()
        );
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // relevance - critical first, then missing, then found
        const order = { critical: 0, missing: 1, found: 2 };
        result.sort((a, b) => order[a.status] - order[b.status]);
    }

    return result;
  }, [persons, filters, sortBy]);

  // ── Pagination ────────────────────────────────────────────────────────

  const totalPages = Math.ceil(filteredPersons.length / ITEMS_PER_PAGE);
  const paginatedPersons = filteredPersons.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages]
  );

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      ageMin: "",
      ageMax: "",
      gender: "",
      location: "",
      status: "",
    });
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filters.ageMin ||
    filters.ageMax ||
    filters.gender ||
    filters.location ||
    filters.status;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0d1f3c] to-[#0a1628] border-b border-white/5 pt-24 pb-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.h1
            className="text-3xl sm:text-4xl font-bold mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Missing Persons Gallery
          </motion.h1>
          <motion.p
            className="text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Browse active missing persons cases. If you recognize someone, report a sighting.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search & Filter Bar */}
        <motion.div
          className="mb-8 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {/* Main search row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                placeholder="Search by name, location..."
                className="w-full py-3 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                  showFilters || hasActiveFilters
                    ? "bg-blue-600/20 border-blue-500/30 text-blue-300"
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                  showMap
                    ? "bg-blue-600/20 border-blue-500/30 text-blue-300"
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </button>

              <div className="flex border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 transition-colors ${
                    viewMode === "grid"
                      ? "bg-blue-600/20 text-blue-300"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-3 transition-colors ${
                    viewMode === "list"
                      ? "bg-blue-600/20 text-blue-300"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Age range */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Age Range</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={filters.ageMin}
                          onChange={(e) => handleFilterChange("ageMin", e.target.value)}
                          className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={filters.ageMax}
                          onChange={(e) => handleFilterChange("ageMax", e.target.value)}
                          className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Gender</label>
                      <select
                        value={filters.gender}
                        onChange={(e) => handleFilterChange("gender", e.target.value)}
                        className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                      >
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0a1628]">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Location</label>
                      <input
                        type="text"
                        placeholder="City, state..."
                        value={filters.location}
                        onChange={(e) => handleFilterChange("location", e.target.value)}
                        className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0a1628]">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <span className="text-sm text-gray-400">
                      {filteredPersons.length} result{filteredPersons.length !== 1 ? "s" : ""}
                    </span>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sort bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">
            Showing {paginatedPersons.length} of {filteredPersons.length} cases
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="py-1.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0a1628]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map placeholder */}
        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 400 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 overflow-hidden"
            >
              <div className="w-full h-full bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Map View</p>
                  <p className="text-sm">
                    {filteredPersons.length} locations plotted
                  </p>
                  <p className="text-xs mt-2 text-gray-600">
                    (Integrate MapComponent from src/components/common/MapComponent)
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[3/4] bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-white/5 rounded w-3/4" />
                  <div className="h-4 bg-white/5 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPersons.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No results found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search or filter criteria.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedPersons.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
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
                        STATUS_COLORS[person.status]
                      }`}
                    >
                      {person.status.charAt(0).toUpperCase() + person.status.slice(1)}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-lg font-bold text-white">{person.name}</h3>
                      <p className="text-sm text-gray-300">
                        Age {person.age} &middot;{" "}
                        {person.gender.charAt(0).toUpperCase() + person.gender.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{person.lastSeenLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      Last seen:{" "}
                      {new Date(person.lastSeenDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-3">
            {paginatedPersons.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <Link
                  to={`/missing-person/${person.id}`}
                  className="group flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:border-blue-500/30 transition-all duration-300 hover:bg-white/10"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={person.photoUrl}
                      alt={person.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white">{person.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                          STATUS_COLORS[person.status]
                        }`}
                      >
                        {person.status.charAt(0).toUpperCase() + person.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>
                        Age {person.age} &middot;{" "}
                        {person.gender.charAt(0).toUpperCase() + person.gender.slice(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {person.lastSeenLocation}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {person.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="text-xs text-gray-500">
                      {new Date(person.lastSeenDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="mt-1 text-blue-400 text-sm group-hover:text-blue-300 transition-colors flex items-center gap-1 justify-end">
                      <Eye className="w-3 h-3" />
                      View
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-2 mt-10" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  page === currentPage
                    ? "bg-blue-600 text-white"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
                }`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default MissingPersonsGallery;
