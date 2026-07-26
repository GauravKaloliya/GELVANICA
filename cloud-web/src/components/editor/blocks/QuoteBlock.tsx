"use client";

interface QuoteBlockProps {
  content: { text: string };
  onChange: (content: { text: string }) => void;
  readOnly?: boolean;
}

export default function QuoteBlock({ content, onChange, readOnly }: QuoteBlockProps) {
  return (
    <div className="flex gap-3 border-l-2 border-border pl-4">
      <textarea
        value={content.text || ""}
        onChange={(e) => onChange({ text: e.target.value })}
        readOnly={readOnly}
        placeholder="Quote..."
        className="flex-1 resize-none bg-transparent text-sm italic text-muted outline-none placeholder:text-muted"
        rows={Math.max(1, Math.ceil((content.text || "").length / 80))}
      />
    </div>
  );
}
