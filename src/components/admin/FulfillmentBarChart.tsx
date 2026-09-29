import React, { useState, useRef, useMemo, useEffect } from 'react';

export interface FulfillmentPoint {
  rawDate?: Date;
  dateLabel: string;
  fullDateLabel?: string;
  taken: number;
  delivered: number;
  inProcess: number;
  notDelivered: number;
}

interface FulfillmentBarChartProps {
  data: FulfillmentPoint[];
}

export default function FulfillmentBarChart({ data }: FulfillmentBarChartProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 320 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const padding = { top: 15, right: 15, bottom: 40, left: 35 };
  const chartWidth = Math.max(dimensions.width - padding.left - padding.right, 50);
  const chartHeight = Math.max(dimensions.height - padding.top - padding.bottom, 50);

  // Calculate dynamic maximum value
  const { maxVal, yTicks } = useMemo(() => {
    let max = 0;
    data.forEach(d => {
      if (d.taken > max) max = d.taken;
      if (d.delivered > max) max = d.delivered;
      if (d.inProcess > max) max = d.inProcess;
      if (d.notDelivered > max) max = d.notDelivered;
    });

    if (max <= 0) max = 10;
    const roundedMax = Math.ceil(max * 1.15);
    let step = 1;
    if (roundedMax > 100) step = 20;
    else if (roundedMax > 50) step = 10;
    else if (roundedMax > 20) step = 5;
    else if (roundedMax > 10) step = 2;

    const finalMax = Math.ceil(roundedMax / step) * step;
    const ticks = [0, Math.round(finalMax * 0.33), Math.round(finalMax * 0.66), finalMax];

    return { maxVal: finalMax, yTicks: ticks };
  }, [data]);

  const groupWidth = data.length > 0 ? chartWidth / data.length : 0;
  const barWidth = Math.min(Math.max((groupWidth - 8) / 4, 3), 12);

  const hoveredData = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full h-full min-w-0 select-none">
      <svg className="w-full h-full overflow-visible">
        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((val, idx) => {
          const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="rgba(200,210,225,0.4)"
                strokeWidth={1}
                strokeDasharray={idx === 0 ? undefined : "3 3"}
              />
              <text
                x={padding.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#64748B] text-[10px] font-bold"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Grouped Bars */}
        {data.map((d, groupIdx) => {
          const groupCenterX = padding.left + groupIdx * groupWidth + groupWidth / 2;
          const totalBarsWidth = barWidth * 4 + 6; // 4 bars + 2px gaps
          const startX = groupCenterX - totalBarsWidth / 2;

          const barKeys: Array<{ key: 'taken' | 'delivered' | 'inProcess' | 'notDelivered'; color: string }> = [
            { key: 'taken', color: '#6366F1' },
            { key: 'delivered', color: '#10B981' },
            { key: 'inProcess', color: '#F59E0B' },
            { key: 'notDelivered', color: '#EF4444' },
          ];

          const isHovered = hoverIndex === groupIdx;

          return (
            <g
              key={groupIdx}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(groupIdx)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {/* Invisible touch/mouse target for the group */}
              <rect
                x={padding.left + groupIdx * groupWidth}
                y={padding.top}
                width={groupWidth}
                height={chartHeight}
                fill="transparent"
              />

              {/* Highlight background on hover */}
              {isHovered && (
                <rect
                  x={padding.left + groupIdx * groupWidth + 2}
                  y={padding.top}
                  width={groupWidth - 4}
                  height={chartHeight}
                  fill="rgba(99,102,241,0.06)"
                  rx={8}
                />
              )}

              {/* 4 Grouped Bars */}
              {barKeys.map((item, bIdx) => {
                const val = d[item.key] || 0;
                const h = Math.max((val / maxVal) * chartHeight, 0);
                const x = startX + bIdx * (barWidth + 2);
                const y = padding.top + chartHeight - h;

                return (
                  <rect
                    key={bIdx}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={h}
                    fill={item.color}
                    rx={3}
                    className="transition-all duration-200"
                    opacity={isHovered ? 1 : 0.88}
                  />
                );
              })}

              {/* X-axis label */}
              <text
                x={groupCenterX}
                y={dimensions.height - 12}
                textAnchor="middle"
                className={`text-[10px] font-bold transition-colors ${
                  isHovered ? 'fill-indigo-600 font-black' : 'fill-[#64748B]'
                }`}
              >
                {d.dateLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip on hover */}
      {hoveredData && hoverIndex !== null && (
        <div
          className="absolute z-20 pointer-events-none transition-all duration-150 ease-out"
          style={{
            left: Math.min(
              Math.max(
                padding.left + hoverIndex * groupWidth + groupWidth / 2 - 100,
                10
              ),
              dimensions.width - 220
            ),
            top: 10,
          }}
        >
          <div className="bg-[#E6ECF4]/95 backdrop-blur-md border border-white/90 p-3.5 rounded-2xl shadow-xl w-56 text-xs select-none">
            <div className="pb-2 border-b border-slate-300/50 mb-2">
              <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                {hoveredData.fullDateLabel || hoveredData.dateLabel}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                  Taken
                </span>
                <span className="font-black text-indigo-700">{hoveredData.taken}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  Delivered
                </span>
                <span className="font-black text-emerald-700">{hoveredData.delivered}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  In Process
                </span>
                <span className="font-black text-amber-700">{hoveredData.inProcess}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  Not Delivered
                </span>
                <span className="font-black text-rose-700">{hoveredData.notDelivered}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
