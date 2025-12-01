interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
}: SuggestionChipsProps) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="text-left px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
