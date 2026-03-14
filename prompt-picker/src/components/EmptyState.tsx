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
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        {title}
      </span>
      {subtitle && (
        <span
          className={`text-[12px] text-neutral-400 dark:text-neutral-500 ${
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
