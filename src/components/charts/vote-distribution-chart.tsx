import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';

type VoteDistributionChartProps = {
  distribution: Record<string, number>;
};

const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function VoteDistributionChart({ distribution }: VoteDistributionChartProps) {
  const chartData = Object.entries(distribution).map(([vote, votes]) => ({
    vote,
    votes,
  }));

  return (
    <ChartContainer config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 25,
          bottom: 0,
        }}
        barCategoryGap={'20%'}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="vote"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="votes" fill="var(--color-desktop)" radius={8}>
          <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
