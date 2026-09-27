import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { disasterService } from '../services/disaster.service';
import type { Disaster, DisasterStats } from '../types';
import { Badge } from '../components/Badge';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DisasterStats | null>(null);
  const [recent, setRecent] = useState<Disaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, disastersRes] = await Promise.all([
          disasterService.getStats(),
          disasterService.getAll({ limit: 5 }),
        ]);
        setStats(statsRes.data.data);
        setRecent(disastersRes.data.data.disasters);
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <Loading text="Loading dashboard..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-400 mt-1">Here's an overview of disaster response operations.</p>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Disasters"
            value={stats.total}
            icon="📊"
            color="text-blue-400"
            bgColor="bg-blue-900/20 border-blue-800"
          />
          <StatCard
            label="Active Disasters"
            value={stats.active}
            icon="🔴"
            color="text-red-400"
            bgColor="bg-red-900/20 border-red-800"
          />
          <StatCard
            label="Resolved"
            value={stats.resolved}
            icon="✅"
            color="text-green-400"
            bgColor="bg-green-900/20 border-green-800"
          />
        </div>
      )}

      {/* Recent disasters */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-semibold text-gray-100">Recent Disasters</h2>
          <Link to="/disasters" className="text-sm text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No disasters found. Start by creating one.</div>
          ) : (
            recent.map((d) => (
              <RecentDisasterRow key={d._id} disaster={d} />
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      {(user?.role === 'ADMIN' || user?.role === 'CONTRIBUTOR') && (
        <div className="mt-6">
          <Link
            to="/disasters/create"
            id="create-disaster-btn"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            + Create Disaster
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${bgColor}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function RecentDisasterRow({ disaster }: { disaster: Disaster }) {
  return (
    <Link
      to={`/disasters/${disaster._id}`}
      className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-200 truncate">{disaster.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{disaster.location?.name}</p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <Badge variant="status" status={disaster.status}>
          {disaster.status}
        </Badge>
        <span className="text-xs text-gray-600">
          {new Date(disaster.createdAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
