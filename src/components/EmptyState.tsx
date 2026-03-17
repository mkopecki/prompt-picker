interface EmptyStateProps {
  title: string;
  subtitle?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  subtitle,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-8 flex flex-col items-center gap-1">
      <span className="text-sm text-neutral-600 dark:text-neutral-300">
        {title}
      </span>
      {subtitle && (
        <span
          className={`text-[12px] text-neutral-500 dark:text-neutral-400 ${
            onAction ? "cursor-pointer hover:text-blue-500 underline" : ""
          }`}
          onClick={onAction}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
