import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TokenUsage } from '../api/tokenUsage';

interface TokenUsageTimeChartProps {
  data: TokenUsage[];
}

export function TokenUsageTimeChart({ data }: TokenUsageTimeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const safeData = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (!svgRef.current || !safeData || safeData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(tooltipRef.current);
    tooltip.style('opacity', 0);

    const width = 1000;
    const height = 450;
    const margin = { top: 40, right: 100, bottom: 70, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 데이터 정렬 및 준비
    const sortedData = [...safeData]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((d) => ({
        date: new Date(d.createdAt),
        promptTokens: d.promptTokens,
        completionTokens: d.completionTokens,
        totalTokens: d.totalTokens,
      }));

    // 스케일 설정
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(sortedData, (d) => d.date) as [Date, Date])
      .range([0, chartWidth]);

    const maxTotal = d3.max(sortedData, (d) => d.totalTokens) || 0;
    const yScale = d3
      .scaleLinear()
      .domain([0, maxTotal * 1.1])
      .nice()
      .range([chartHeight, 0]);

    // 그리드 라인
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-chartWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', '#475569')
      .style('stroke-width', 1)
      .style('opacity', 0.2);

    // X축
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(d3.timeDay.every(1))
          .tickFormat(d3.timeFormat('%m/%d') as any)
      )
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '12px')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    // Y축
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .tickFormat((d) => {
            const value = Number(d);
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value.toString();
          })
      )
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '12px');

    // 축 스타일
    g.selectAll('.domain')
      .style('stroke', '#475569')
      .style('stroke-width', 1.5);

    g.selectAll('.tick line')
      .style('stroke', '#475569')
      .style('opacity', 0.3);

    // 그라데이션 정의 (라인용)
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'line-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#a78bfa')
      .attr('stop-opacity', 1);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#60a5fa')
      .attr('stop-opacity', 1);

    // 영역 채우기 (area chart)
    const area = d3
      .area<typeof sortedData[0]>()
      .x((d) => xScale(d.date))
      .y0(chartHeight)
      .y1((d) => yScale(d.totalTokens))
      .curve(d3.curveMonotoneX);

    // 영역
    g.append('path')
      .datum(sortedData)
      .attr('fill', 'url(#line-gradient)')
      .attr('fill-opacity', 0.2)
      .attr('d', area);

    // 라인 생성 함수
    const line = d3
      .line<typeof sortedData[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.totalTokens))
      .curve(d3.curveMonotoneX);

    // 라인 경로
    const linePath = g
      .append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', 'url(#line-gradient)')
      .attr('stroke-width', 3)
      .attr('d', line)
      .style('filter', 'drop-shadow(0 2px 4px rgba(167, 139, 250, 0.3))');

    // 라인 길이 계산 및 애니메이션
    const totalLength = linePath.node()?.getTotalLength() || 0;
    linePath
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // 데이터 포인트
    const dots = g
      .selectAll('.dot')
      .data(sortedData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', chartHeight)
      .attr('r', 0)
      .attr('fill', '#a78bfa')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 2px 4px rgba(167, 139, 250, 0.5))');

    // 포인트 애니메이션
    dots
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .ease(d3.easeCubicOut)
      .attr('cy', (d) => yScale(d.totalTokens))
      .attr('r', 6);

    // 호버 효과 및 tooltip
    dots
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 10)
          .style('filter', 'drop-shadow(0 4px 8px rgba(167, 139, 250, 0.8))');

        const dateStr = d3.timeFormat('%Y년 %m월 %d일 %H:%M')(d.date);
        tooltip
          .style('opacity', 1)
          .html(`
            <div class="text-xs text-slate-400 mb-2">${dateStr}</div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background: #60a5fa"></div>
                <span class="text-sm text-slate-300">프롬프트:</span>
                <span class="text-sm font-semibold text-blue-400">${d.promptTokens.toLocaleString()}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full" style="background: #34d399"></div>
                <span class="text-sm text-slate-300">완성:</span>
                <span class="text-sm font-semibold text-green-400">${d.completionTokens.toLocaleString()}</span>
              </div>
              <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700">
                <div class="w-3 h-3 rounded-full" style="background: #a78bfa"></div>
                <span class="text-sm text-slate-300">총 토큰:</span>
                <span class="text-lg font-bold text-purple-400">${d.totalTokens.toLocaleString()}</span>
              </div>
            </div>
          `);
      })
      .on('mousemove', function (event) {
        const [x, y] = d3.pointer(event, svgRef.current);
        tooltip
          .style('left', `${x + 15}px`)
          .style('top', `${y - 10}px`);
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6)
          .style('filter', 'drop-shadow(0 2px 4px rgba(167, 139, 250, 0.5))');

        tooltip.style('opacity', 0);
      });

    // 범례
    const legend = g
      .append('g')
      .attr('transform', `translate(${chartWidth - 80}, 20)`);

    const legendData = [
      { label: '총 토큰', color: '#a78bfa' },
    ];

    legendData.forEach((item, i) => {
      const legendItem = legend
        .append('g')
        .attr('transform', `translate(0, ${i * 25})`);

      legendItem
        .append('line')
        .attr('x1', 0)
        .attr('x2', 25)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', item.color)
        .attr('stroke-width', 3)
        .style('filter', 'drop-shadow(0 2px 4px rgba(167, 139, 250, 0.3))');

      legendItem
        .append('text')
        .attr('x', 30)
        .attr('y', 4)
        .style('fill', '#cbd5e1')
        .style('font-size', '13px')
        .style('font-weight', '500')
        .text(item.label);
    });
  }, [data, safeData]);

  if (!safeData || safeData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">시간별 토큰 사용량</h3>
        <div className="text-center text-slate-500 dark:text-slate-400 py-8">데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 relative shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-slate-100">시간별 토큰 사용량</h3>
      <div className="flex justify-center overflow-x-auto relative">
        <svg ref={svgRef} width={1000} height={450}></svg>
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xl z-10 transition-opacity min-w-[200px]"
          style={{ opacity: 0 }}
        ></div>
      </div>
    </div>
  );
}
