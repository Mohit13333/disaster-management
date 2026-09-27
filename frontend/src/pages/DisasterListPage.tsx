import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { disasterService } from '../services/disaster.service';
import type { Disaster } from '../types';
import { DisasterCard } from '../components/DisasterCard';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

export function DisasterListPage() {
  const { user } = useAuth();
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDisasters = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await disasterService.getAll({
        tag: tagFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 12,
      });
      setDisasters(res.data.data.disasters);
      setTotal(res.data.data.total);
    } catch {
      setError('Failed to load disasters');
    } finally {
      setIsLoading(false);
    }
  }, [tagFilter, statusFilter, page]);

  useEffect(() => {
    fetchDisasters();
  }, [fetchDisasters]);

  const { lastEvent } = useSocket();
  useEffect(() => {
    if (lastEvent) {
      fetchDisasters();
    }
  }, [lastEvent, fetchDisasters]);

  const handleFilterChange = () => {
    setPage(1);
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Disasters</h1>
          <p className="text-gray-400 text-sm mt-1">{total} total</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'CONTRIBUTOR') && (
          <Link
            to="/disasters/create"
            id="create-disaster-link"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            + New Disaster
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl border border-gray-800 bg-gray-900">
        <input
          id="tag-filter"
          type="text"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); handleFilterChange(); }}
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />

        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange(); }}
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {(tagFilter || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setTagFilter(''); setStatusFilter(''); handleFilterChange(); }}
          >
            Clear Filters
          </Button>
        )}

        <Button variant="secondary" size="sm" onClick={fetchDisasters}>
          ↻ Refresh
        </Button>
      </div>

      {/* Content */}
      {error && <ErrorMessage message={error} />}

      {isLoading ? (
        <Loading text="Loading disasters..." />
      ) : disasters.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🌎</p>
          <p>No disasters found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {disasters.map((d) => (
            <DisasterCard key={d._id} disaster={d} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </Button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
