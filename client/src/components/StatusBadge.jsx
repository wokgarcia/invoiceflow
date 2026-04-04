const STATUS_STYLES = {
  Draft:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Sent:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Paid:    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.Draft}`}>
      {status === 'Overdue' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
      )}
      {status === 'Paid' && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status}
    </span>
  );
}
