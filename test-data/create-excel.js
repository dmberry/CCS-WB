const XLSX = require('xlsx');
const data = [
  ['employee_id', 'team', 'performance_score', 'tenure_years', 'satisfaction'],
  [1, 'A', 85, 2.5, 4.2],
  [2, 'A', 92, 5.0, 4.8],
  [3, 'B', 78, 1.2, 3.5],
  [4, 'B', 88, 3.8, 4.1],
  [5, 'C', 95, 7.1, 4.9],
  [6, 'C', 72, 0.5, 3.2],
  [7, 'A', 89, 4.2, 4.5],
  [8, 'B', 84, 2.9, 3.9],
  [9, 'C', 91, 6.3, 4.7],
  [10, 'A', 76, 1.8, 3.6]
];
const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, __dirname + '/team_performance.xlsx');
console.log('Excel file created successfully');
