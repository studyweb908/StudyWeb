const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceContainer.tsx', 'utf8');

const t1 = `  const [activeTab, setActiveTab] = useState<TabType>('overview');`;
const r1 = `  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);`;

code = code.replace(t1, r1);
fs.writeFileSync('src/components/Dashboard/WorkspaceContainer.tsx', code);
