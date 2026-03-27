import { PackageSearch } from 'lucide-react';

export default function EmptyState({ message = 'No se encontraron resultados', icon: Icon = PackageSearch }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon size={48} className="mb-4 opacity-40" />
      <p className="text-base font-medium">{message}</p>
    </div>
  );
}
