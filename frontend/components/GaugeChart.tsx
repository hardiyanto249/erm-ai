
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface GaugeChartProps {
  value: number;
  maxValue: number;
  label: string;
  unit: string;
  goodThreshold: number;
  warningThreshold: number;
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value, maxValue, label, unit, goodThreshold, warningThreshold }) => {
  const percentage = (value / maxValue) * 100;
  
  const color = useMemo(() => {
    if (value <= goodThreshold) return '#36d399'; // success
    if (value <= warningThreshold) return '#fbbd23'; // warning
    return '#f87272'; // error
  }, [value, goodThreshold, warningThreshold]);

  const data = [
    { name: 'value', value: value },
    { name: 'remaining', value: maxValue - value },
  ];

  const startAngle = 180;
  const endAngle = 0;

  return (
    <div className="flex flex-col items-center w-full max-w-xs">
        <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="100%"
                        dataKey="value"
                        startAngle={startAngle}
                        endAngle={endAngle}
                        innerRadius="60%"
                        outerRadius="100%"
                        paddingAngle={0}
                        // FIX: Removed invalid 'blendStroke' prop. It is not a valid prop for the Pie component and was causing a TypeScript error.
                    >
                        <Cell fill={color} stroke={color} />
                        <Cell fill="#374151" stroke="#374151" />
                        <Label
                            value={`${value}${unit}`}
                            position="center"
                            dy={-15}
                            fontSize="24px"
                            fontWeight="bold"
                            fill="#FFFFFF"
                        />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
      <p className="text-base-content font-semibold mt-2 text-center">{label}</p>
      <p className="text-xs text-gray-500">Batas Ideal: &lt; {goodThreshold}{unit}</p>
    </div>
  );
};

export default GaugeChart;
