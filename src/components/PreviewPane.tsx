interface PreviewPaneProps {
  content: string | null;
}

export default function PreviewPane({ content }: PreviewPaneProps) {
  if (!content) return null;

  return (
    <div className="mx-3 mt-2 mb-1">
      <div className="relative rounded-md bg-neutral-50 dark:bg-neutral-700/50 px-2.5 py-2 max-h-[60px] overflow-hidden">
        <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap">
          {content}
        </p>
        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-b from-transparent to-neutral-50 dark:to-neutral-700/50 pointer-events-none" />
      </div>
    </div>
  );
}
