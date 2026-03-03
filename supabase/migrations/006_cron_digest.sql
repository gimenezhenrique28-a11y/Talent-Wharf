-- 006: Enable pg_net + pg_cron for daily Slack digest

-- Outbound HTTP from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Safely replace schedule if it already exists
DO $$ BEGIN PERFORM cron.unschedule('wharf-slack-daily-digest'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 9:00 AM UTC every weekday (Mon–Fri)
SELECT cron.schedule(
  'wharf-slack-daily-digest',
  '0 9 * * 1-5',
  $job$
  SELECT net.http_post(
    url     := 'https://yfhwmbywrgzkdddwddtd.supabase.co/functions/v1/slack-digest',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $job$
);
