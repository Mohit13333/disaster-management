import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { disasterService } from '../services/disaster.service';
import type { Disaster, Resource, Report } from '../types';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { ResourceCard } from '../components/ResourceCard';
import { ReportCard } from '../components/ReportCard';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';

export function DisasterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [disaster, setDisaster] = useState<Disaster | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resourcesError, setResourcesError] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [hasLoadedResources, setHasLoadedResources] = useState(false);
  const [hasLoadedReports, setHasLoadedReports] = useState(false);
  const [radiusInput, setRadiusInput] = useState<string>('50');

  useEffect(() => {
    if (!id) return;

    const fetchDisaster = async () => {
      try {
        const res = await disasterService.getOne(id);
        setDisaster(res.data.data);
      } catch {
        setError('Disaster not found');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisaster();
  }, [id]);

  const loadResources = async () => {
    if (!disaster || !id) return;
    setResourcesLoading(true);
    setResourcesError('');
    try {
      const radius = Number(radiusInput) || 50;
      const [lng, lat] = disaster.location.coordinates;
      const res = await disasterService.getNearbyResources(id, lat, lng, radius);
      setResources(res.data.data);
      setHasLoadedResources(true);
    } catch {
      setResourcesError('Failed to load nearby resources');
    } finally {
      setResourcesLoading(false);
    }
  };

  const loadReports = async () => {
    if (!id) return;
    setReportsLoading(true);
    setReportsError('');
    try {
      const res = await disasterService.getReports(id);
      setReports(res.data.data);
      setHasLoadedReports(true);
    } catch {
      setReportsError('Failed to load community reports');
    } finally {
      setReportsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this disaster? This action cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await disasterService.delete(id);
      navigate('/disasters');
    } catch {
      setError('Failed to delete disaster');
      setIsDeleting(false);
    }
  };

  if (isLoading) return <Loading text="Loading disaster..." />;
  if (!disaster) return <div className="p-8 text-center text-gray-500">{error}</div>;

  const [lng, lat] = disaster.location.coordinates;
  const date = new Date(disaster.createdAt).toLocaleString();
  const updatedAt = new Date(disaster.updatedAt).toLocaleString();
  const createdByName = typeof disaster.createdBy === 'object' ? disaster.createdBy.name : 'Unknown';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/disasters" className="hover:text-gray-300">Disasters</Link>
        <span>/</span>
        <span className="text-gray-300 truncate">{disaster.title}</span>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-100">{disaster.title}</h1>
            <Badge variant="status" status={disaster.status}>{disaster.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {disaster.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {(user?.role === 'ADMIN' || user?.role === 'CONTRIBUTOR') && (
            <Link to={`/disasters/${id}/edit`}>
              <Button variant="secondary" size="sm">Edit</Button>
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Button
              id="delete-disaster-btn"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Description</h2>
            <p className="text-gray-300 leading-relaxed">{disaster.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Location</h2>
            <p className="text-gray-200 font-medium mb-1">{disaster.location.name}</p>
            <p className="text-xs text-gray-500 font-mono">
              {lat.toFixed(4)}°, {lng.toFixed(4)}°
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created by</span>
                <span className="text-gray-300">{createdByName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300 text-xs">{date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-300 text-xs">{updatedAt}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nearby Resources */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Nearby Resources</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="radius" className="text-xs text-gray-400">Radius:</label>
              <div className="flex items-center">
                <input
                  type="text"
                  id="radius"
                  value={radiusInput}
                  onChange={(e) => setRadiusInput(e.target.value.replace(/\D/g, ''))}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-l px-2 py-1 w-16 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <span className="bg-gray-700 border border-gray-700 text-gray-400 text-xs rounded-r px-2 py-1 border-l-0">km</span>
              </div>
            </div>
            <Button
              id="load-resources-btn"
              variant="secondary"
              size="sm"
              onClick={loadResources}
              isLoading={resourcesLoading}
            >
              {resources.length > 0 ? '↻ Refresh' : 'Load Resources'}
            </Button>
          </div>
        </div>
        {resourcesError && <ErrorMessage message={resourcesError} />}
        {resources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resources.map((r) => (
              <ResourceCard key={String(r._id)} resource={r} />
            ))}
          </div>
        ) : (
          !resourcesLoading && hasLoadedResources ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-8 text-center text-gray-400 text-sm">
              No resources found within a {radiusInput || 50}km radius.
            </div>
          ) : !resourcesLoading && (
            <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
              Click "Load Resources" to find nearby shelters, hospitals, and more.
            </div>
          )
        )}
      </section>

      {/* Community Reports */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Community Reports</h2>
          <Button
            id="load-reports-btn"
            variant="secondary"
            size="sm"
            onClick={loadReports}
            isLoading={reportsLoading}
          >
            {reports.length > 0 ? '↻ Refresh' : 'Load Reports'}
          </Button>
        </div>
        {reportsError && <ErrorMessage message={reportsError} />}
        {reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        ) : (
          !reportsLoading && hasLoadedReports ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-8 text-center text-gray-400 text-sm">
              No community reports found for this disaster yet.
            </div>
          ) : !reportsLoading && (
            <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
              Click "Load Reports" to fetch community reports from social media.
            </div>
          )
        )}
      </section>
    </div>
  );
}
