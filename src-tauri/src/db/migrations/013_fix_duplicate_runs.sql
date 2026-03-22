-- Fix duplicate run_number records created by migration 010 + start_task race
-- Keep only the run with actual execution data (most steps linked), delete the rest
DELETE FROM task_runs WHERE id IN (
    SELECT tr.id FROM task_runs tr
    INNER JOIN (
        SELECT task_id, run_number
        FROM task_runs
        GROUP BY task_id, run_number
        HAVING COUNT(*) > 1
    ) dups ON tr.task_id = dups.task_id AND tr.run_number = dups.run_number
    WHERE tr.id NOT IN (
        SELECT tr2.id FROM task_runs tr2
        INNER JOIN (
            SELECT run_id, COUNT(*) as cnt FROM task_steps WHERE run_id IS NOT NULL GROUP BY run_id
        ) sc ON sc.run_id = tr2.id
        WHERE tr2.task_id = dups.task_id AND tr2.run_number = dups.run_number
        ORDER BY sc.cnt DESC
        LIMIT 1
    )
    AND tr.id NOT IN (
        SELECT id FROM task_runs tr3
        WHERE tr3.task_id = dups.task_id AND tr3.run_number = dups.run_number
        ORDER BY tr3.started_at DESC
        LIMIT 1
    )
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_runs_unique_number ON task_runs(task_id, run_number);
