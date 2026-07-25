const babel = require('@babel/core');
const fs = require('fs');

const code = fs.readFileSync('src/components/Dashboard/DashboardHome.tsx', 'utf8');
// Just looking at the JSX structure
