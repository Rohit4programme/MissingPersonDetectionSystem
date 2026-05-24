import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  MapPin,
  Map as MapIcon,
  Calendar,
  User,
  Ruler,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  Navigation,
  Eye,
  AlertTriangle,
  Loader2,
  Filter,
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
  height: string;
  distance?: number;
}

interface SearchFilters {
  query: string;
  ageMin: string;
  ageMax: string;
  gender: string;
  status: string;
  radius: string;
  dateFrom: string;
  dateTo: string;
}

type ViewMode = "grid" | "list";
type SortBy = "relevance" | "date" | "name" | "distance";

// ─── Constants ──────────────────────────────────────────────────────────────

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

const RADIUS_OPTIONS = [
  { value: "", label: "Any Distance" },
  { value: "5", label: "Within 5 miles" },
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Date (Most Recent)" },
  { value: "name", label: "Name (A-Z)" },
  { value: "distance", label: "Distance" },
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
    height: "5'6\"",
    distance: 3.2,
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
    height: "5'10\"",
    distance: 1200,
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
    description: "Last seen at Golden Gate Park. Small build, black hair, wearing a pink dress.",
    height: "4'0\"",
    distance: 1850,
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
    description: "Last seen at work. 6'1\", 200 lbs, black hair, brown eyes.",
    height: "6'1\"",
    distance: 920,
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
    height: "5'5\"",
    distance: 1450,
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
    description: "Last seen walking home from school. 5'6\", slim, short black hair.",
    height: "5'6\"",
    distance: 680,
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
    height: "5'2\"",
    distance: 2100,
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
    height: "5'11\"",
    distance: 1000,
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("relevance");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("q") || "",
    ageMin: searchParams.get("ageMin") || "",
    ageMax: searchParams.get("ageMax") || "",
    gender: searchParams.get("gender") || "",
    status: searchParams.get("status") || "",
    radius: searchParams.get("radius") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  });

  // Try to get user location for distance sorting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // silently fail
        }
      );
    }
  }, []);

  // Simulate search loading
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [filters, sortBy]);

  const handleFilterChange = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      ageMin: "",
      ageMax: "",
      gender: "",
      status: "",
      radius: "",
      dateFrom: "",
      dateTo: "",
    });
    setSearchParams({});
  };

  const hasActiveFilters =
    filters.ageMin ||
    filters.ageMax ||
    filters.gender ||
    filters.status ||
    filters.radius ||
    filters.dateFrom ||
    filters.dateTo;

  const activeFilterCount = [
    filters.ageMin,
    filters.ageMax,
    filters.gender,
    filters.status,
    filters.radius,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  // ── Filtering & Sorting ───────────────────────────────────────────────

  const results = useMemo(() => {
    let data = [...MOCK_PERSONS];

    // Text search
    if (filters.query) {
      const q = filters.query.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.lastSeenLocation.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    // Age
    if (filters.ageMin) {
      data = data.filter((p) => p.age >= parseInt(filters.ageMin, 10));
    }
    if (filters.ageMax) {
      data = data.filter((p) => p.age <= parseInt(filters.ageMax, 10));
    }

    // Gender
    if (filters.gender) {
      data = data.filter((p) => p.gender === filters.gender);
    }

    // Status
    if (filters.status) {
      data = data.filter((p) => p.status === filters.status);
    }

    // Radius (distance-based)
    if (filters.radius && userLocation) {
      const maxDist = parseFloat(filters.radius);
      data = data.filter((p) => (p.distance || 9999) <= maxDist);
    }

    // Date range
    if (filters.dateFrom) {
      data = data.filter(
        (p) => new Date(p.lastSeenDate) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      data = data.filter(
        (p) => new Date(p.lastSeenDate) <= new Date(filters.dateTo)
      );
    }

    // Sorting
    switch (sortBy) {
      case "date":
        data.sort(
          (a, b) =>
            new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime()
        );
        break;
      case "name":
        data.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "distance":
        data.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
        break;
      default: {
        // relevance: critical first, then by recency
        const order = { critical: 0, missing: 1, found: 2 };
        data.sort((a, b) => {
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
          return new Date(b.lastSeenDate).getTime() - new Date(a.lastSeenDate).getTime();
        });
      }
    }

    return data;
  }, [filters, sortBy, userLocation]);

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
          >
            Search Missing Persons
          </motion.h1>
          <motion.p
            className="text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Search across all active missing persons cases with advanced filters.
          </motion.p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Large search bar */}
        <motion.form
          onSubmit={handleSearch}
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
            <Search className="absolute left-5 w-6 h-6 text-gray-400" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => handleFilterChange("query", e.target.value)}
              placeholder="Search by name, location, description, or case ID..."
              className="w-full py-5 pl-14 pr-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
            />
            <button
              type="submit"
              className="px-8 py-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              Search
            </button>
          </div>
        </motion.form>

        {/* Toolbar */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-blue-600/20 border-blue-500/30 text-blue-300"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                showMap
                  ? "bg-blue-600/20 border-blue-500/30 text-blue-300"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>

            <div className="flex border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${
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
                className={`p-2.5 transition-colors ${
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

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none pr-8"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#0a1628]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Advanced filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Advanced Filters</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear all
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Age range */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Age Range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.ageMin}
                        onChange={(e) => handleFilterChange("ageMin", e.target.value)}
                        className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.ageMax}
                        onChange={(e) => handleFilterChange("ageMax", e.target.value)}
                        className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Gender</label>
                    <select
                      value={filters.gender}
                      onChange={(e) => handleFilterChange("gender", e.target.value)}
                      className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                    >
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0a1628]">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange("status", e.target.value)}
                      className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0a1628]">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location radius */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Distance (from your location)
                      </span>
                    </label>
                    <select
                      value={filters.radius}
                      onChange={(e) => handleFilterChange("radius", e.target.value)}
                      className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                    >
                      {RADIUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0a1628]">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {!userLocation && filters.radius && (
                      <p className="text-xs text-amber-400 mt-1">Enable location for distance filtering</p>
                    )}
                  </div>

                  {/* Date from */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Date From</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                      className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                    />
                  </div>

                  {/* Date to */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Date To</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                      className="w-full py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map view */}
        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 450 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 overflow-hidden"
            >
              <div className="w-full h-full bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Search Results Map</p>
                  <p className="text-sm">
                    {results.length} locations plotted
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
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Searching...</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Results Found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Try adjusting your search terms or filters to find what you are looking for.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((person, index) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <Link
                  to={`/missing-person/${person.id}`}
                  className="group block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 h-full"
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
                        Age {person.age} &middot; {person.height}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{person.lastSeenLocation}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(person.lastSeenDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {person.distance && (
                        <span className="text-gray-600">{person.distance} mi</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {person.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-3">
            {results.map((person, index) => (
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
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                      <span>Age {person.age}</span>
                      <span>{person.gender.charAt(0).toUpperCase() + person.gender.slice(1)}</span>
                      <span>{person.height}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {person.lastSeenLocation}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{person.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="text-xs text-gray-500">
                      {new Date(person.lastSeenDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {person.distance && (
                      <div className="text-xs text-gray-600 mt-1">
                        {person.distance} mi away
                      </div>
                    )}
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
      </div>
    </div>
  );
};

export default SearchPage;
