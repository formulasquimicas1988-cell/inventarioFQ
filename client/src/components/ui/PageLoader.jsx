export default function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-deep-blue rounded-full animate-spin"
          style={{ borderWidth: '3px' }}
        />
        <span className="text-sm">Cargando...</span>
      </div>
    </div>
  );
}
