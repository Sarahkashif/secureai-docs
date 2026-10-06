import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface Series {
  key: string
  label: string
  color: string
}

const tick = { fill: 'currentColor', fontSize: 12 }
const tooltipStyle = { borderRadius: 8, fontSize: 12 }

export function StackedBars({ data, series, height = 240 }: { data: Record<string, string | number>[]; series: Series[]; height?: number }) {
  return (
    <div className="text-slate-500 dark:text-slate-400" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={tick} />
          <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} contentStyle={tooltipStyle} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function HorizontalBars({ data, height = 240, color = '#2563EB' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  return (
    <div className="text-slate-500 dark:text-slate-400" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={tick} />
          <YAxis type="category" dataKey="label" width={120} tickLine={false} axisLine={false} tick={tick} />
          <Tooltip cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} contentStyle={tooltipStyle} />
          <Bar dataKey="value" name="Count" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
