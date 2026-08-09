import ComingSoon from './ComingSoon';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  
  Plus, 
  Save, 
  Trash2, 
  Compass, 
  Share2, 
  Dribbble, 
  HelpCircle,
  Clock,
  Eye,
  Settings,
  ChevronRight,
  
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Code,
  Check,
  X as CloseIcon,
  
  Search,
  FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Workspace, WorkspaceNote } from './WorkspaceTypes';

interface WorkspaceNotebookProps {
  workspace: Workspace;
  onAddNote: (note: WorkspaceNote) => void;
  onRemoveNote: (noteId: string) => void;
}

export default function WorkspaceNotebook(props: any) {
  return <ComingSoon title="AI Notes" description="This AI-powered workspace feature is currently under construction." />;
}
