-- Sprint 7: Extend agent_template enum with Walletz Digital Team types
-- PostgreSQL ALTER TYPE ... ADD VALUE is non-transactional; each ADD VALUE is safe to run independently.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'radar_editais' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'radar_editais';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'reception' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'reception';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sdr_inbound' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'sdr_inbound';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sdr_outbound' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'sdr_outbound';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pre_qualifier' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'pre_qualifier';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'commercial_consultant' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'commercial_consultant';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'followup_commercial' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'followup_commercial';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'executive_assistant' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'executive_assistant';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'agenda_ai' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'agenda_ai';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'customer_success_cs' AND enumtypid = 'agent_template'::regtype) THEN
    ALTER TYPE "agent_template" ADD VALUE 'customer_success_cs';
  END IF;
END $$;
