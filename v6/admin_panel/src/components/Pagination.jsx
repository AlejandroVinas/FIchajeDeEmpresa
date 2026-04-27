export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        className="btn btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>

      <p className="text-sm text-gray-600">
        Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
      </p>

      <button
        type="button"
        className="btn btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
