"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

interface TableBlockProps {
  content: { rows?: string[][]; columns?: string[] };
  onChange: (content: { rows: string[][]; columns: string[] }) => void;
  readOnly?: boolean;
}

const DEFAULT_COLUMNS = ["Column 1", "Column 2", "Column 3"];
const DEFAULT_ROWS = [["", "", ""], ["", "", ""]];

export default function TableBlock({ content, onChange, readOnly }: TableBlockProps) {
  const columns = content.columns?.length ? content.columns : DEFAULT_COLUMNS;
  const rows = content.rows?.length ? content.rows : DEFAULT_ROWS;
  const [editingCol, setEditingCol] = useState<number | null>(null);

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = rows.map((row, ri) =>
      ri === rowIdx ? row.map((cell, ci) => (ci === colIdx ? value : cell)) : [...row]
    );
    onChange({ rows: newRows, columns });
  };

  const addRow = () => {
    onChange({ rows: [...rows, columns.map(() => "")], columns });
  };

  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    onChange({ rows: rows.filter((_, i) => i !== rowIdx), columns });
  };

  const addColumn = () => {
    const newCol = `Column ${columns.length + 1}`;
    onChange({
      columns: [...columns, newCol],
      rows: rows.map((row) => [...row, ""]),
    });
  };

  const removeColumn = (colIdx: number) => {
    if (columns.length <= 1) return;
    onChange({
      columns: columns.filter((_, i) => i !== colIdx),
      rows: rows.map((row) => row.filter((_, i) => i !== colIdx)),
    });
  };

  const updateColumnName = (colIdx: number, name: string) => {
    const newCols = columns.map((c, i) => (i === colIdx ? name : c));
    onChange({ rows, columns: newCols });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((col, colIdx) => (
              <th key={colIdx} className="relative bg-zinc-900/50 px-3 py-2 text-left">
                {editingCol === colIdx ? (
                  <input
                    type="text"
                    value={col}
                    onChange={(e) => updateColumnName(colIdx, e.target.value)}
                    onBlur={() => setEditingCol(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingCol(null)}
                    autoFocus
                    className="w-full bg-transparent text-xs font-medium text-zinc-300 outline-none"
                  />
                ) : (
                  <button
                    onClick={() => !readOnly && setEditingCol(colIdx)}
                    className="text-xs font-medium text-zinc-400 hover:text-zinc-200"
                  >
                    {col}
                  </button>
                )}
                {!readOnly && columns.length > 1 && (
                  <button
                    onClick={() => removeColumn(colIdx)}
                    className="absolute right-1 top-1 hidden rounded p-0.5 text-zinc-600 hover:text-red-400 group-hover:block"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </th>
            ))}
            {!readOnly && (
              <th className="w-8 bg-zinc-900/50">
                <button onClick={addColumn} className="text-zinc-600 hover:text-zinc-300" aria-label="Add column">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="group border-b border-zinc-800/50">
              {row.map((cell, colIdx) => (
                <td key={colIdx} className="px-3 py-1.5">
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => updateCell(rowIdx, colIdx, e.target.value)}
                    readOnly={readOnly}
                    placeholder="..."
                    className="w-full bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-700"
                  />
                </td>
              ))}
              {!readOnly && (
                <td className="w-8">
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(rowIdx)}
                      className="hidden rounded p-0.5 text-zinc-600 hover:text-red-400 group-hover:block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1 border-t border-zinc-800 py-1.5 text-[11px] text-zinc-600 hover:text-zinc-400"
        >
          <Plus className="h-3 w-3" /> Add row
        </button>
      )}
    </div>
  );
}
