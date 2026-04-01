const STATUS_STYLES = {
  Draft:   'bg-gray-100 text-gray-600',
  Sent:    'bg-blue-100 text-blue-700',
  Paid:    'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.Draft}`}>
      {status}
    </span>
  );
}
