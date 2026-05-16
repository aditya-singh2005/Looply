import Link from "next/link";
function TargetIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
      <circle cx="60" cy="60" r="52" stroke="#EEF2FF" strokeWidth="8" />
      <circle cx="60" cy="60" r="36" stroke="#C7D2FE" strokeWidth="8" />
      <circle cx="60" cy="60" r="20" stroke="#4F46E5" strokeWidth="8" />
      <circle cx="60" cy="60" r="6" fill="#4F46E5" />
    </svg>
  );
}

export function EmptyState({
  title = "No goals added yet",
  description = "Start by adding your first goal for this performance cycle",
  actionLabel = "Add Your First Goal",
  actionHref = "/goals/new",
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
      <TargetIllustration />
      <h3 className="mt-6 text-lg font-semibold text-gray-700">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
