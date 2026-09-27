import { Link } from 'react-router-dom';
import type { Disaster } from '../types';
import { Badge } from './Badge';

export function DisasterCard({ disaster }: { disaster: Disaster }) {
  const createdBy = typeof disaster.createdBy === 'object' ? disaster.createdBy.name : 'Unknown';
  const date = new Date(disaster.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      to={`/disasters/${disaster._id}`}
      id={`disaster-card-${disaster._id}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-600 hover:bg-gray-800/50"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-100 line-clamp-1">{disaster.title}</h3>
        <Badge variant="status" status={disaster.status}>
          {disaster.status}
        </Badge>
      </div>

      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{disaster.description}</p>

      {disaster.location && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.012 17 12.508 17 9A7 7 0 103 9c0 3.509 1.699 6.012 3.354 7.585.83.799 1.654 1.38 2.274 1.765.311.193.571.337.757.433a5.741 5.741 0 00.281.14l.018.008.006.003zM10 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
          </svg>
          <span className="truncate flex-1">
            {disaster.location.name} <span className="font-mono text-[10px] opacity-60">({disaster.location.coordinates[1].toFixed(4)}°, {disaster.location.coordinates[0].toFixed(4)}°)</span>
          </span>
        </div>
      )}

      {disaster.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {disaster.tags.slice(0, 4).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
          {disaster.tags.length > 4 && (
            <Badge>+{disaster.tags.length - 4}</Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>By {createdBy}</span>
        <span>{date}</span>
      </div>
    </Link>
  );
}
