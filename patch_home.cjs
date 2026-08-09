const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/DashboardHome.tsx', 'utf8');

code = code.replace("import { CalendarWidget, TodayTasksCard, AIInsightsCard, RecentStudyMaterials } from './DashboardWidgets';", "import { CalendarWidget, TodayTasksCard, AIInsightsCard, RecentStudyMaterials, StorageQuotaWidget } from './DashboardWidgets';");

const targetRender = `        {/* Mini Calendar (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 lg:col-span-4 h-full min-w-0">
          <CalendarWidget />
        </motion.div>

      </div>
    </motion.div>`;

const replaceRender = `        {/* Mini Calendar (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-12 lg:col-span-4 h-full min-w-0">
          <CalendarWidget />
        </motion.div>
        
        {/* ROW 3 */}
        
        {/* Storage Quota (4 cols) */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-6 lg:col-span-4 h-full min-w-0">
          <StorageQuotaWidget workspaces={workspaces} />
        </motion.div>

      </div>
    </motion.div>`;

code = code.replace(targetRender, replaceRender);
fs.writeFileSync('src/components/Dashboard/DashboardHome.tsx', code);
console.log("Patched DashboardHome.tsx with StorageQuotaWidget");
