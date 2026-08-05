import type { Citation } from "../../types/chat";

interface Props {
  citations: Citation[];
}

export function CitationList({ citations }: Props) {
  if (citations.length === 0) return null;

  return (
    <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
      <strong>Fuentes:</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
        {citations.map((c, i) => {
          const filename = c.location.split("/").pop() ?? c.location;
          return (
            <li key={i} title={c.text}>
              {filename}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
