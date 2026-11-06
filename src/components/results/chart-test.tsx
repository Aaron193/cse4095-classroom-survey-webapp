import { createRoot } from "react-dom/client";
import { ResponsiveContainer } from "recharts";
import { ResultsBarChart } from "./ResultsBarChart";

createRoot(document.getElementById("root")!).render(
  <div style={{ width: 400, height: 20 }}>
    <ResponsiveContainer width="100%" height={20}>
      <ResultsBarChart percentage={37.5} />
    </ResponsiveContainer>
  </div>,
);
