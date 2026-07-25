"use client";

interface QuoteBlockProps {
  content: { text: string };
  onChange: (content: { text: string }) => void;
  readOnly?: boolean;
}

export default function QuoteBlock({ content, onChange, readOnly }: QuoteBlockProps) {
  return (
    <div className="flex gap-3 border-l-2 border-zinc-600 pl-4">
      <textarea
        value={content.text || ""}
        onChange={(e) => onChange({ text: e.target.value })}
        readOnly={readOnly}
        placeholder="Quote..."
        className="flex-1 resize-none bg-transparent text-sm italic text-zinc-400 outline-none placeholder:text-zinc-600"
        rows={Math.max(1, Math.ceil((content.text || "").length / 80))}
      />
    </div>
  );
}
