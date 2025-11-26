import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { TokenUsageStats } from '../api/tokenUsage';

interface TokenUsageChartProps {
  stats: TokenUsageStats;
}

export function TokenUsageChart({ stats }: TokenUsageChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !stats) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(tooltipRef.current);
    tooltip.style('opacity', 0);

    const width = 800;
    const height = 450;
    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 데이터 준비
    const data = [
      { label: '프롬프트 토큰', value: stats.totalPromptTokens ?? 0, color: '#60a5fa' },
      { label: '완성 토큰', value: stats.totalCompletionTokens ?? 0, color: '#34d399' },
    ];

    // 스케일 설정
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, chartWidth])
      .padding(0.4);

    const maxValue = d3.max(data, (d) => d.value) || 0;
    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .nice()
      .range([chartHeight, 0]);

    // 그리드 라인 (더 부드럽게)
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(-chartHeight)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', '#475569')
      .style('stroke-width', 1)
      .style('opacity', 0.2);

    // Y축 그리드
    g.append('g')
      .attr('class', 'grid-y')
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
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('fill', '#94a3b8')
      .style('font-size', '13px')
      .style('font-weight', '500');

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

    // 그라데이션 정의
    const defs = svg.append('defs');
    data.forEach((d, i) => {
      const gradient = defs
        .append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.rgb(d.color).brighter(0.3).toString())
        .attr('stop-opacity', 1);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d.color)
        .attr('stop-opacity', 1);
    });

    // 바 차트
    const bars = g
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.label) || 0)
      .attr('y', chartHeight)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', (d, i) => `url(#gradient-${i})`)
      .attr('rx', 8)
      .attr('ry', 8)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    // 애니메이션
    bars
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => yScale(d.value))
      .attr('height', (d) => chartHeight - yScale(d.value));

    // 호버 효과 및 tooltip
    bars
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('y', (d) => yScale(d.value) - 5)
          .attr('height', (d) => chartHeight - yScale(d.value) + 5)
          .style('filter', 'drop-shadow(0 8px 12px rgba(0, 0, 0, 0.2))');

        tooltip
          .style('opacity', 1)
          .html(`
            <div class="font-semibold mb-1">${d.label}</div>
            <div class="text-2xl font-bold" style="color: ${d.color}">${d.value.toLocaleString()}</div>
            <div class="text-xs text-slate-400 mt-1">토큰</div>
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
          .attr('y', (d) => yScale(d.value))
          .attr('height', (d) => chartHeight - yScale(d.value))
          .style('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

        tooltip.style('opacity', 0);
      });

    // 값 레이블 (더 세련되게)
    g.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
      .attr('y', chartHeight)
      .attr('text-anchor', 'middle')
      .style('fill', '#e2e8f0')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('opacity', 0)
      .text((d) => {
        const value = d.value;
        if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toLocaleString();
      })
      .transition()
      .duration(800)
      .delay(400)
      .attr('y', (d) => yScale(d.value) - 15)
      .style('opacity', 1);
  }, [stats]);

  return (
    <div className="bg-slate-800 rounded-lg p-6 relative">
      <h3 className="text-xl font-semibold mb-6 text-slate-200">토큰 사용량 비교</h3>
      <div className="flex justify-center relative">
        <svg ref={svgRef} width={800} height={450}></svg>
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl z-10 transition-opacity"
          style={{ opacity: 0 }}
        ></div>
      </div>
    </div>
  );
}
