import type { Resource } from '../types';
import { Badge } from './Badge';

const resourceIcons: Record<string, string> = {
  SHELTER: '🏠',
  HOSPITAL: '🏥',
  FOOD: '🍽️',
  WATER: '💧',
  RESCUE: '🚁',
};

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{resourceIcons[resource.type] ?? '📍'}</span>
          <span className="font-medium text-gray-100 text-sm">{resource.name}</span>
        </div>
        <Badge variant="resource">{resource.type}</Badge>
      </div>
      {resource.distance_km !== undefined && (
        <p className="text-xs text-gray-500">
          📏 {resource.distance_km} km away
        </p>
      )}
    </div>
  );
}
