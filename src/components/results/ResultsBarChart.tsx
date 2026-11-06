import { Bar, BarChart, XAxis, YAxis } from "recharts";

export function ResultsBarChart({ percentage }: { percentage: number }) {
  return (
    <BarChart
      layout="vertical"
      data={[{ category: "choice", percentage }]}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <XAxis type="number" domain={[0, 100]} hide />
      <YAxis type="category" dataKey="category" hide />
      <Bar dataKey="percentage" fill="#2457a7" isAnimationActive={false} />
    </BarChart>
  );
}
