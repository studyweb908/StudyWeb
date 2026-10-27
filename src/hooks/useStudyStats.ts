/**
 * useStudyStats
 *
 * Real-time reactive hook that listens to live study hours and daily streaks.
 * Ticks continuously as the student studies on StudyWeb.
 */

import { useState, useEffect } from 'react';
import { StudyTrackerService, FormattedStudyStats } from '../services/StudyTrackerService';

export function useStudyStats(): FormattedStudyStats {
  const [stats, setStats] = useState<FormattedStudyStats>(() => {
    return StudyTrackerService.getFormattedStats();
  });

  useEffect(() => {
    // Initial sync
    setStats(StudyTrackerService.getFormattedStats());

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setStats(e.detail);
      } else {
        setStats(StudyTrackerService.getFormattedStats());
      }
    };

    window.addEventListener('studyweb-study-stats-updated', handleUpdate);
    return () => {
      window.removeEventListener('studyweb-study-stats-updated', handleUpdate);
    };
  }, []);

  return stats;
}
