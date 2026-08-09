const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', 'utf8');

const emptyTarget = `<div className="text-center py-10 text-slate-500 text-sm font-medium">
            No study materials have been uploaded to this workspace yet.
          </div>`;

const emptyReplacement = `<div className="text-center py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-slate-100/50">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 mb-4">
              <HardDrive className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-slate-800 font-bold mb-1">No Study Materials Yet</h4>
            <p className="text-slate-500 text-sm max-w-sm">Upload files, paste text, or link websites above to start building your AI knowledge base.</p>
          </div>`;

if (code.includes('No study materials have been uploaded to this workspace yet.')) {
  code = code.replace(emptyTarget, emptyReplacement);
  fs.writeFileSync('src/components/Dashboard/WorkspaceLibrary.tsx', code);
  console.log('Patched empty state');
} else {
  console.log('Could not find empty state target');
}
