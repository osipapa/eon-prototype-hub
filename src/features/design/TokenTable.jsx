import { BRAND, GREY, RADIUS, SPACE, STATE, SURFACE, TEXT, TOKEN_SETS, TYPE, WEIGHTS } from "@kb/tokens.js";

/* A ```tokens:<set>``` fence: the token table plus a visual column, drawn
   from the same data the agent reads as a plain table. */
const Swatch = ({ value, c }) => <span className="eon-token-swatch" style={{ background: value, boxShadow: `inset 0 0 0 1px ${c.border}` }} />;

const VISUALS = {
  space: (i, c) => <span className="eon-token-bar" style={{ width: SPACE[i].px, background: c.brand }} />,
  radius: (i, c) => <span className="eon-token-radius" style={{ borderTopLeftRadius: Math.min(RADIUS[i].px, 40), borderColor: c.brand, background: `${c.brand}1f` }} />,
  type: (i) => <span className="eon-token-type" style={{ fontSize: TYPE[i].px }}>Aa</span>,
  weight: (i) => <span className="eon-token-type" style={{ fontSize: 20, fontWeight: WEIGHTS[i].value }}>Aa</span>,
  brand: (i, c) => <Swatch value={BRAND[i].value} c={c} />,
  grey: (i, c) => <Swatch value={GREY[i].value} c={c} />,
  state: (i, c) => <span className="eon-token-pair"><Swatch value={STATE[i].light} c={c} /><Swatch value={STATE[i].dark} c={c} /></span>,
  surface: (i, c) => <span className="eon-token-pair"><Swatch value={SURFACE[i].dark} c={c} /><Swatch value={SURFACE[i].light} c={c} /></span>,
  text: (i) => (
    <span className="eon-token-pair">
      <span className="eon-token-text" style={{ background: "#000", color: TEXT[i].dark }}>Aa</span>
      <span className="eon-token-text" style={{ background: "#F9F9FD", color: TEXT[i].light }}>Aa</span>
    </span>
  ),
};

const CODE_COLUMN = /^(Token)$/;

export default function TokenTable({ set, c }) {
  const table = TOKEN_SETS[set];
  if (!table) return <p className="eon-docs-unknown" style={{ color: c.muted }}>Unknown token set “{set}”.</p>;
  const visual = VISUALS[set];
  return (
    <div className="eon-token-table-wrap" style={{ borderColor: c.border }}>
      <table className="eon-token-table">
        <thead>
          <tr style={{ color: c.text }}>
            {table.columns.map((column) => <th key={column} style={{ borderColor: c.border }}>{column}</th>)}
            {visual && <th style={{ borderColor: c.border }}>Visual</th>}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={row[0] + index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ borderColor: c.border, color: cellIndex ? c.secondary : c.text }}>
                  {CODE_COLUMN.test(table.columns[cellIndex]) ? <code className="eon-docs-inline-code" style={{ background: c.raised }}>{cell}</code> : cell}
                </td>
              ))}
              {visual && <td className="eon-token-visual" style={{ borderColor: c.border }}>{visual(index, c)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
