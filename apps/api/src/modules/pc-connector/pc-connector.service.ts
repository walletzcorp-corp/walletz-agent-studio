import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { pcDevices, pcCommands } from '../../database/schema';
import { AuditService } from '../../shared/audit/audit.service';
import { v4 as uuidv4 } from 'uuid';

const COMMAND_TIMEOUT_MS = 30_000;

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

function constantTimeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function isPathAuthorized(candidate: string, allowed: string[]): boolean {
  const target = normalizePath(candidate);
  if (target.split('/').includes('..')) return false;
  return allowed.some((entry) => {
    const root = normalizePath(entry);
    return root.length > 0 && (target === root || target.startsWith(`${root}/`));
  });
}

type Capabilities = {
  files?: Record<string, boolean>;
  apps?: Record<string, boolean>;
  browser?: Record<string, boolean>;
  system?: Record<string, boolean>;
};

@Injectable()
export class PcConnectorService {
  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly auditService: AuditService,
  ) {}

  async generatePairingToken(tenantId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db.insert(pcDevices).values({
      id: uuidv4(),
      tenantId,
      deviceName: 'Aguardando pareamento...',
      platform: 'windows',
      // Only the hash is stored: a database read cannot be replayed as a pairing token.
      pairingToken: sha256(token),
      pairingExpiresAt: expiresAt,
      authorizedPaths: [] as unknown as never,
    });

    return { token, expiresAt };
  }

  async pairDevice(
    token: string,
    deviceName: string,
    platform: string,
  ): Promise<{ deviceId: string; deviceSecret: string }> {
    const [device] = await this.db
      .select()
      .from(pcDevices)
      .where(eq(pcDevices.pairingToken, sha256(token)));

    if (!device) throw new NotFoundException('Pairing token not found');
    if (!device.pairingExpiresAt || device.pairingExpiresAt < new Date()) {
      throw new BadRequestException('Pairing token expired');
    }
    if (device.pairedAt) throw new BadRequestException('Already paired');

    const deviceSecret = randomBytes(32).toString('hex');
    const now = new Date();
    const paired = await this.db
      .update(pcDevices)
      .set({
        deviceName,
        platform,
        pairingToken: null,
        deviceSecretHash: sha256(deviceSecret),
        pairedAt: now,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(and(eq(pcDevices.id, device.id), eq(pcDevices.tenantId, device.tenantId)))
      .returning({ id: pcDevices.id });

    if (paired.length === 0) throw new BadRequestException('Already paired');

    await this.auditService.log({
      tenantId: device.tenantId,
      action: 'pc_connector.device_paired',
      resourceType: 'pc_device',
      resourceId: device.id,
      metadata: { deviceName, platform },
    });

    return { deviceId: device.id, deviceSecret };
  }

  private readonly devicePublicColumns = {
    id: pcDevices.id,
    tenantId: pcDevices.tenantId,
    deviceName: pcDevices.deviceName,
    platform: pcDevices.platform,
    pairedAt: pcDevices.pairedAt,
    lastSeenAt: pcDevices.lastSeenAt,
    capabilities: pcDevices.capabilities,
    authorizedPaths: pcDevices.authorizedPaths,
    authorizedApps: pcDevices.authorizedApps,
    createdAt: pcDevices.createdAt,
    updatedAt: pcDevices.updatedAt,
  };

  async listDevices(tenantId: string) {
    return this.db
      .select(this.devicePublicColumns)
      .from(pcDevices)
      .where(eq(pcDevices.tenantId, tenantId));
  }

  async getDevice(tenantId: string, deviceId: string) {
    const [device] = await this.db
      .select(this.devicePublicColumns)
      .from(pcDevices)
      .where(and(eq(pcDevices.id, deviceId), eq(pcDevices.tenantId, tenantId)));

    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async disconnectDevice(tenantId: string, deviceId: string, userId?: string) {
    const removed = await this.db
      .delete(pcDevices)
      .where(and(eq(pcDevices.id, deviceId), eq(pcDevices.tenantId, tenantId)))
      .returning({ id: pcDevices.id });

    if (removed.length === 0) throw new NotFoundException('Device not found');

    await this.auditService.log({
      tenantId,
      userId,
      action: 'pc_connector.device_disconnected',
      resourceType: 'pc_device',
      resourceId: deviceId,
    });
  }

  async updateCapabilities(
    tenantId: string,
    deviceId: string,
    capabilities: Record<string, unknown>,
    userId?: string,
  ) {
    for (const [group, flags] of Object.entries(capabilities)) {
      const isFlagMap =
        typeof flags === 'object' &&
        flags !== null &&
        !Array.isArray(flags) &&
        Object.values(flags as Record<string, unknown>).every((v) => typeof v === 'boolean');
      if (!isFlagMap) {
        throw new BadRequestException(`Capability group "${group}" must be a map of booleans`);
      }
    }

    const updated = await this.db
      .update(pcDevices)
      .set({ capabilities: capabilities as never, updatedAt: new Date() })
      .where(and(eq(pcDevices.id, deviceId), eq(pcDevices.tenantId, tenantId)))
      .returning({ id: pcDevices.id });

    if (updated.length === 0) throw new NotFoundException('Device not found');

    await this.auditService.log({
      tenantId,
      userId,
      action: 'pc_connector.capabilities_updated',
      resourceType: 'pc_device',
      resourceId: deviceId,
      newState: { capabilities },
    });
  }

  /**
   * Server-side enforcement of what a device allows, independent of whatever the model or the
   * connector script claims: capability flags, authorized folders and authorized applications.
   */
  private assertCommandPermitted(
    device: { capabilities: unknown; authorizedPaths: unknown; authorizedApps: unknown },
    toolName: string,
    params: Record<string, unknown>,
  ): void {
    const caps = (device.capabilities ?? {}) as Capabilities;
    const flag = (group: keyof Capabilities, key: string, defaultOn: boolean): boolean => {
      const value = caps[group]?.[key];
      return value === undefined ? defaultOn : value === true;
    };

    const denied = (reason: string): never => {
      throw new ForbiddenException(`Command not permitted for this device: ${reason}`);
    };

    switch (toolName) {
      case 'pc.listFiles':
      case 'pc.readFile':
        if (!flag('files', 'read', true)) denied('files.read disabled');
        break;
      case 'pc.createFile':
      case 'pc.createFolder':
        if (!flag('files', 'create', true)) denied('files.create disabled');
        break;
      case 'pc.renameFile':
        if (!flag('files', 'rename', false)) denied('files.rename disabled');
        break;
      case 'pc.moveFile':
        if (!flag('files', 'move', false)) denied('files.move disabled');
        break;
      case 'pc.openApplication':
        if (!flag('apps', 'open', false)) denied('apps.open disabled');
        break;
      case 'pc.openUrl':
        if (!flag('browser', 'openUrl', true)) denied('browser.openUrl disabled');
        break;
      case 'pc.getDeviceInfo':
        if (!flag('system', 'info', true)) denied('system.info disabled');
        break;
      default:
        denied(`unknown tool ${toolName}`);
    }

    const authorizedPaths = Array.isArray(device.authorizedPaths)
      ? (device.authorizedPaths as string[])
      : [];
    for (const key of ['path', 'source', 'destination']) {
      const value = params[key];
      if (value === undefined) continue;
      if (typeof value !== 'string' || !isPathAuthorized(value, authorizedPaths)) {
        denied(`path outside the authorized folders (${key})`);
      }
    }

    if (toolName === 'pc.openApplication') {
      const authorizedApps = Array.isArray(device.authorizedApps)
        ? (device.authorizedApps as string[]).map((a) => a.toLowerCase())
        : [];
      if (
        typeof params['app'] !== 'string' ||
        !authorizedApps.includes(params['app'].toLowerCase())
      ) {
        denied('application is not authorized');
      }
    }
  }

  async enqueueCommand(
    tenantId: string,
    deviceId: string,
    toolName: string,
    params: Record<string, unknown>,
    agentId?: string,
  ): Promise<PcCommandResult> {
    const [device] = await this.db
      .select()
      .from(pcDevices)
      .where(and(eq(pcDevices.id, deviceId), eq(pcDevices.tenantId, tenantId)));

    if (!device) throw new NotFoundException('Device not found');
    if (!device.pairedAt) throw new BadRequestException('Device not paired');

    if (!device.lastSeenAt || Date.now() - device.lastSeenAt.getTime() > 30_000) {
      throw new BadRequestException(
        'Device appears offline. Make sure Walletz PC Connector is running.',
      );
    }

    this.assertCommandPermitted(device, toolName, params);

    const riskLevel = this.getRiskLevel(toolName);
    const commandId = uuidv4();

    if (riskLevel === 'high') {
      await this.db.insert(pcCommands).values({
        id: commandId,
        deviceId,
        tenantId,
        agentId: agentId ?? null,
        toolName,
        params: params as never,
        status: 'awaiting_approval',
        riskLevel,
        requiresApproval: true,
      });
      // Return immediately — the command awaits human approval via PATCH /commands/:id/approve
      return { success: false, error: 'AWAITING_APPROVAL', commandId };
    }

    await this.db.insert(pcCommands).values({
      id: commandId,
      deviceId,
      tenantId,
      agentId: agentId ?? null,
      toolName,
      params: params as never,
      status: 'pending',
      riskLevel,
      requiresApproval: false,
    });

    return this.waitForResult(tenantId, commandId);
  }

  private async waitForResult(tenantId: string, commandId: string): Promise<PcCommandResult> {
    const deadline = Date.now() + COMMAND_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const [cmd] = await this.db
        .select()
        .from(pcCommands)
        .where(and(eq(pcCommands.id, commandId), eq(pcCommands.tenantId, tenantId)));

      if (!cmd) throw new NotFoundException('Command not found');
      if (cmd.status === 'completed')
        return { success: true, result: cmd.result as Record<string, unknown> };
      if (cmd.status === 'failed') return { success: false, error: cmd.error ?? 'Unknown error' };

      await sleep(500);
    }

    await this.db
      .update(pcCommands)
      .set({ status: 'timeout', completedAt: new Date() })
      .where(
        and(
          eq(pcCommands.id, commandId),
          eq(pcCommands.tenantId, tenantId),
          eq(pcCommands.status, 'pending'),
        ),
      );

    return { success: false, error: 'Command timed out — PC Connector did not respond in 30s' };
  }

  async approveCommand(
    tenantId: string,
    commandId: string,
    approved: boolean,
    userId?: string,
  ): Promise<{ commandId: string; status: string }> {
    const nextStatus = approved ? 'pending' : 'rejected';

    // Single atomic transition: only an awaiting_approval command of THIS tenant can move.
    const updated = await this.db
      .update(pcCommands)
      .set(
        approved
          ? { status: 'pending', requiresApproval: false }
          : { status: 'rejected', completedAt: new Date() },
      )
      .where(
        and(
          eq(pcCommands.id, commandId),
          eq(pcCommands.tenantId, tenantId),
          eq(pcCommands.status, 'awaiting_approval'),
        ),
      )
      .returning({ id: pcCommands.id });

    if (updated.length === 0) {
      const [cmd] = await this.db
        .select({ status: pcCommands.status })
        .from(pcCommands)
        .where(and(eq(pcCommands.id, commandId), eq(pcCommands.tenantId, tenantId)));
      if (!cmd) throw new NotFoundException('Command not found');
      throw new BadRequestException(
        `Command is in '${cmd.status}' state — only awaiting_approval commands can be reviewed`,
      );
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: approved ? 'pc_connector.command_approved' : 'pc_connector.command_rejected',
      resourceType: 'pc_command',
      resourceId: commandId,
    });

    return { commandId, status: nextStatus };
  }

  private async authenticateDevice(
    deviceId: string,
    secret: string | undefined,
  ): Promise<{ id: string; tenantId: string }> {
    if (!secret) throw new UnauthorizedException('X-Device-Secret header is required');
    const [device] = await this.db
      .select({
        id: pcDevices.id,
        tenantId: pcDevices.tenantId,
        deviceSecretHash: pcDevices.deviceSecretHash,
      })
      .from(pcDevices)
      .where(eq(pcDevices.id, deviceId));
    if (!device?.deviceSecretHash) throw new UnauthorizedException('Device not paired');
    if (!constantTimeEqualHex(sha256(secret), device.deviceSecretHash)) {
      throw new UnauthorizedException('Invalid device secret');
    }
    return { id: device.id, tenantId: device.tenantId };
  }

  async getPendingCommands(deviceId: string, deviceSecret: string | undefined) {
    const device = await this.authenticateDevice(deviceId, deviceSecret);

    await this.db
      .update(pcDevices)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(pcDevices.id, device.id), eq(pcDevices.tenantId, device.tenantId)));

    return this.db
      .select()
      .from(pcCommands)
      .where(
        and(
          eq(pcCommands.deviceId, device.id),
          eq(pcCommands.tenantId, device.tenantId),
          inArray(pcCommands.status, ['pending']),
        ),
      );
  }

  async postCommandResult(
    deviceId: string,
    commandId: string,
    success: boolean,
    result?: Record<string, unknown>,
    error?: string,
    deviceSecret?: string,
  ) {
    const device = await this.authenticateDevice(deviceId, deviceSecret);

    // Only a command that was actually handed to this device (pending) can receive a result;
    // a device can never complete a command that is awaiting approval or already finished.
    const updated = await this.db
      .update(pcCommands)
      .set({
        status: success ? 'completed' : 'failed',
        result: (result ?? null) as never,
        error: error ?? null,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(pcCommands.id, commandId),
          eq(pcCommands.deviceId, device.id),
          eq(pcCommands.tenantId, device.tenantId),
          eq(pcCommands.status, 'pending'),
        ),
      )
      .returning({ id: pcCommands.id });

    if (updated.length === 0) {
      const [cmd] = await this.db
        .select({ status: pcCommands.status })
        .from(pcCommands)
        .where(
          and(
            eq(pcCommands.id, commandId),
            eq(pcCommands.deviceId, device.id),
            eq(pcCommands.tenantId, device.tenantId),
          ),
        );
      if (!cmd) throw new NotFoundException('Command not found');
      throw new ConflictException(`Command is already '${cmd.status}'`);
    }
  }

  private getRiskLevel(toolName: string): 'low' | 'medium' | 'high' {
    const low = ['pc.listFiles', 'pc.readFile', 'pc.getDeviceInfo'];
    const high = ['pc.deleteFile', 'pc.adminAction'];
    if (low.includes(toolName)) return 'low';
    if (high.includes(toolName)) return 'high';
    return 'medium';
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export interface PcCommandResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  commandId?: string;
}
