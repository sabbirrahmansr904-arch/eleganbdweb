import React, { useState, useRef, useMemo, useEffect } from 'react';
import { formatPrice } from '../../lib/utils';

export interface SalesReportPoint {
  name: string;
  sales: number;
  profit: number;
  dateLabel?: string;
}

interface SalesReportAreaChartProps {
  data: SalesReportPoint[];
  currLabel: string;
  prevLabel: string;
  currency: any;
  rate: number;
}

export default function SalesReportAreaChart({
  data,
  currLabel,
  prevLabel,
  currency,
  rate
}: SalesReportAreaChartProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 260 });
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

  const padding = { top: 15, right: 20, bottom: 35, left: 45 };
  const chartWidth = Math.max(dimensions.width - padding.left - padding.right, 50);
  const chartHeight = Math.max(dimensions.height - padding.top - padding.bottom, 50);

  // Calculate dynamic scale
  const { maxVal, yTicks } = useMemo(() => {
    let max = 0;
    data.forEach(d => {
      if (d.sales > max) max = d.sales;
      if (d.profit > max) max = d.profit;
    });

    if (max <= 0) max = 1000;
    // Add 15% headroom
    const roundedMax = Math.ceil(max * 1.15);
    
    // Nice rounded steps
    let step = 100;
    if (roundedMax > 100000) step = 25000;
    else if (roundedMax > 50000) step = 10000;
    else if (roundedMax > 20000) step = 5000;
    else if (roundedMax > 10000) step = 2500;
    else if (roundedMax > 5000) step = 1000;
    else if (roundedMax > 1000) step = 500;
    else if (roundedMax > 500) step = 100;

    const finalMax = Math.ceil(roundedMax / step) * step;
    const ticks = [0, finalMax * 0.25, finalMax * 0.5, finalMax * 0.75, finalMax];

    return { maxVal: finalMax, yTicks: ticks };
  }, [data]);

  // Points coordinates
  const { salesPoints, profitPoints, xCoords } = useMemo(() => {
    if (!data || data.length === 0) {
      return { salesPoints: [], profitPoints: [], xCoords: [] };
    }

    const count = data.length;
    const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth / 2;

    const sPts: { x: number; y: number }[] = [];
    const pPts: { x: number; y: number }[] = [];
    const xPositions: number[] = [];

    data.forEach((d, idx) => {
      const x = padding.left + (count > 1 ? idx * stepX : chartWidth / 2);
      const salesRatio = Math.min(Math.max(d.sales / maxVal, 0), 1);
      const profitRatio = Math.min(Math.max(d.profit / maxVal, 0), 1);
      const ySales = padding.top + chartHeight - salesRatio * chartHeight;
      const yProfit = padding.top + chartHeight - profitRatio * chartHeight;

      sPts.push({ x, y: ySales });
      pPts.push({ x, y: yProfit });
      xPositions.push(x);
    });

    return { salesPoints: sPts, profitPoints: pPts, xCoords: xPositions };
  }, [data, chartWidth, chartHeight, maxVal, padding.left, padding.top]);

  // Build smooth bezier path
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      const cp1x = p0.x + dx * 0.4;
      const cp1y = p0.y;
      const cp2x = p1.x - dx * 0.4;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const salesLinePath = useMemo(() => buildSmoothPath(salesPoints), [salesPoints]);
  const profitLinePath = useMemo(() => buildSmoothPath(profitPoints), [profitPoints]);

  const bottomY = padding.top + chartHeight;
  const salesAreaPath = useMemo(() => {
    if (salesPoints.length === 0) return '';
    return `${salesLinePath} L ${salesPoints[salesPoints.length - 1].x} ${bottomY} L ${salesPoints[0].x} ${bottomY} Z`;
  }, [salesLinePath, salesPoints, bottomY]);

  const profitAreaPath = useMemo(() => {
    if (profitPoints.length === 0) return '';
    return `${profitLinePath} L ${profitPoints[profitPoints.length - 1].x} ${bottomY} L ${profitPoints[0].x} ${bottomY} Z`;
  }, [profitLinePath, profitPoints, bottomY]);

  // Handle mouse move for interactive tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (xCoords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    let closestIdx = 0;
    let closestDist = Infinity;
    xCoords.forEach((x, idx) => {
      const dist = Math.abs(x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Format y-axis tick label
  const formatYTick = (val: number) => {
    if (val === 0) return '৳0';
    if (val >= 1000) {
      const k = val / 1000;
      return `৳${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
    }
    return `৳${val}`;
  };

  const hoveredData = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;
  const hoveredSalesPt = hoverIndex !== null ? salesPoints[hoverIndex] : null;
  const hoveredProfitPt = hoverIndex !== null ? profitPoints[hoverIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full h-full min-w-0 select-none">
      <svg
        className="w-full h-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="profitAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.01} />
          </linearGradient>
          <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

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
                stroke="#F3F4F6"
                strokeWidth={1}
                strokeDasharray={idx === 0 ? undefined : "3 3"}
              />
              <text
                x={padding.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#9CA3AF] text-[10px] font-bold"
              >
                {formatYTick(val)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, idx) => {
          const x = xCoords[idx];
          if (x === undefined) return null;
          return (
            <text
              key={idx}
              x={x}
              y={dimensions.height - 10}
              textAnchor="middle"
              className={`text-[10px] font-bold transition-colors ${
                hoverIndex === idx ? 'fill-indigo-600 font-black' : 'fill-[#9CA3AF]'
              }`}
            >
              {d.name}
            </text>
          );
        })}

        {/* Filled Areas */}
        {profitAreaPath && (
          <path d={profitAreaPath} fill="url(#profitAreaGradient)" />
        )}
        {salesAreaPath && (
          <path d={salesAreaPath} fill="url(#salesAreaGradient)" />
        )}

        {/* Stroke Lines */}
        {profitLinePath && (
          <path
            d={profitLinePath}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {salesLinePath && (
          <path
            d={salesLinePath}
            fill="none"
            stroke="#6366F1"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover elements: Vertical guideline and dots */}
        {hoverIndex !== null && hoveredSalesPt && hoveredProfitPt && (
          <g className="transition-all duration-150">
            {/* Vertical crosshair */}
            <line
              x1={hoveredSalesPt.x}
              y1={padding.top}
              x2={hoveredSalesPt.x}
              y2={bottomY}
              stroke="#6366F1"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.6}
            />

            {/* Profit Dot */}
            <circle
              cx={hoveredProfitPt.x}
              cy={hoveredProfitPt.y}
              r={5}
              fill="#94A3B8"
              stroke="#FFFFFF"
              strokeWidth={2}
              filter="url(#shadowFilter)"
            />

            {/* Sales Dot with Pulse Ring */}
            <circle
              cx={hoveredSalesPt.x}
              cy={hoveredSalesPt.y}
              r={9}
              fill="#6366F1"
              opacity={0.2}
            />
            <circle
              cx={hoveredSalesPt.x}
              cy={hoveredSalesPt.y}
              r={5.5}
              fill="#6366F1"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              filter="url(#shadowFilter)"
            />
          </g>
        )}
      </svg>

      {/* Interactive Tooltip Card matching visual specs perfectly */}
      {hoveredData && hoveredSalesPt && (
        <div
          className="absolute z-20 pointer-events-none transition-all duration-150 ease-out"
          style={{
            left: Math.min(Math.max(hoveredSalesPt.x - 120, 10), dimensions.width - 250),
            top: Math.max(hoveredSalesPt.y - 110, 10),
          }}
        >
          <div className="bg-[#F8F9FD]/95 backdrop-blur-md border border-gray-200/80 p-3.5 rounded-2xl shadow-xl w-60 text-xs select-none">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 mb-2.5">
              <span className="font-black text-gray-700 uppercase tracking-wider">
                {hoveredData.name} {hoveredData.dateLabel ? `(${hoveredData.dateLabel})` : ''}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] shrink-0" />
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-gray-500 font-medium">{currLabel}</span>
                  <span className="font-black text-gray-900">
                    {formatPrice(hoveredData.sales, currency, rate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8] shrink-0" />
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-gray-500 font-medium">{prevLabel}</span>
                  <span className="font-black text-gray-900">
                    {formatPrice(hoveredData.profit, currency, rate)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
