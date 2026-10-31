import { useId } from "react";
export function TrendChart({
  label,
  series,
  dates,
  percent = false,
  emptyLabel = "Sin datos registrados en el período.",
}: {
  label: string;
  series: { name: string; color: string; values: (number | null)[] }[];
  dates: string[];
  percent?: boolean;
  emptyLabel?: string;
}) {
  const id = useId();
  const max = percent
    ? 100
    : Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)));
  const x = (i: number) => 45 + (i * 610) / Math.max(1, dates.length - 1);
  const y = (v: number) => 190 - (v / max) * 165;
  const hasData = series.some((s) => s.values.some((v) => v !== null));
  return (
    <figure className="analytics__chart">
      <figcaption>
        <h2 className="typography__heading">{label}</h2>
      </figcaption>
      {!hasData ? (
        <p className="analytics__empty">{emptyLabel}</p>
      ) : (
        <>
          <div className="analytics__plot">
            <div className="analytics__axis" aria-hidden="true">
              {[1, 0.5, 0].map((t) => (
                <span key={t}>
                  {Math.round(t * max)}
                  {percent ? "%" : ""}
                </span>
              ))}
            </div>
            <svg viewBox="40 15 630 185" role="img" aria-labelledby={id}>
              <title id={id}>
                {label}.{" "}
                {series
                  .map((s) => `${s.name}: ${s.values.filter((v) => v !== null).join(", ")}`)
                  .join(". ")}
              </title>
              {[0, 0.5, 1].map((t) => (
                <g key={t}>
                  <line x1="45" x2="655" y1={y(t * max)} y2={y(t * max)} stroke="#d8dce6" />
                </g>
              ))}
              {series.map((s) => (
                <g key={s.name}>
                  <path
                    d={s.values
                      .map((v, i) =>
                        v === null
                          ? ""
                          : `${i === 0 || s.values[i - 1] === null ? "M" : "L"}${x(i)},${y(v)}`,
                      )
                      .join(" ")}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="3"
                  />
                  {s.values.map((v, i) =>
                    v === null ? null : (
                      <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={s.color}>
                        <title>
                          {dates[i]} · {s.name}: {v}
                          {percent ? "%" : ""}
                        </title>
                      </circle>
                    ),
                  )}
                </g>
              ))}
            </svg>
          </div>
          <div className="analytics__dates" aria-hidden="true">
            <span>{dates[0]?.slice(0, 10)}</span>
            <span>{dates.at(-1)?.slice(0, 10)}</span>
          </div>
        </>
      )}
      <div className="analytics__legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </figure>
  );
}
export function Distribution({ open, closed }: { open: number; closed: number }) {
  const total = open + closed;
  const angle = total ? (open / total) * 360 : 0;
  return (
    <figure className="analytics__chart">
      <figcaption>
        <h2 className="typography__heading">Estado actual de bugs</h2>
      </figcaption>
      <div className="analytics__distribution">
        <div
          className="analytics__donut"
          role="img"
          aria-label={`${open} abiertos, ${closed} cerrados`}
          style={{
            background: total
              ? `conic-gradient(#7563dc ${angle}deg,#37a58b ${angle}deg)`
              : "#e1e4eb",
          }}
        >
          <strong>{total}</strong>
        </div>
        <div>
          <p>
            En seguimiento <strong>{open}</strong>
          </p>
          <p>
            Cerrados <strong>{closed}</strong>
          </p>
        </div>
      </div>
    </figure>
  );
}
export function Bars({
  items,
  ranked = false,
  emptyLabel = "Sin datos registrados.",
}: {
  items: { label: string; value: number; total: number }[];
  ranked?: boolean;
  emptyLabel?: string;
}) {
  return (
    <div className="analytics__bars">
      {!items.length && <p>{emptyLabel}</p>}
      {items.map((item, i) => (
        <div className="analytics__bar-item" key={i}>
          <div className="analytics__bar-label">
            <span>
              {ranked && (
                <span className="analytics__rank" aria-hidden="true">
                  {i + 1}
                </span>
              )}
              {item.label}
            </span>
            <strong>
              {item.value} / {item.total}
            </strong>
          </div>
          <progress max={Math.max(1, item.total)} value={item.value} aria-label={item.label} />
        </div>
      ))}
    </div>
  );
}
