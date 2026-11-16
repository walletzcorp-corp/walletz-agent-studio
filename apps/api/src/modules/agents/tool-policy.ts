import type { AgentExecutionContext } from './execution-context';

export const SCHEDULING_TOOL_NAMES = [
  'get_availability',
  'create_meeting',
  'find_meetings',
  'reschedule_meeting',
  'cancel_meeting',
] as const;

/**
 * Server-side tool authorization. Evaluated both when building the tool list offered to the
 * model and again when a tool call is executed, so a hallucinated or injected call to a tool
 * that was never offered is still refused. Unknown tools are denied.
 */
export function isToolAllowed(toolName: string, ctx: AgentExecutionContext): boolean {
  if ((SCHEDULING_TOOL_NAMES as readonly string[]).includes(toolName)) return true;

  // Computer-control tools act on a tenant device: only an authenticated tenant member working
  // in the internal lab may use them. Never reachable from an external channel.
  if (toolName.startsWith('pc.')) {
    return ctx.source === 'internal_user' && ctx.channel === 'lab';
  }

  return false;
}

// Permissions are stored with catalog names (AVAILABLE_TOOLS); the runtime uses tool names.
const PERMISSION_ALIASES: Record<string, string[]> = {
  check_availability: ['get_availability', 'find_meetings'],
  schedule_appointment: ['create_meeting', 'reschedule_meeting'],
  cancel_appointment: ['cancel_meeting'],
};

/** Expands "allowed = false" catalog entries into the concrete runtime tool names they block. */
export function expandDeniedTools(deniedCatalogNames: string[]): Set<string> {
  const denied = new Set<string>();
  for (const name of deniedCatalogNames) {
    denied.add(name);
    for (const alias of PERMISSION_ALIASES[name] ?? []) denied.add(alias);
  }
  return denied;
}
