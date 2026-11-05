import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { DRIZZLE_TOKEN, type DrizzleDB } from '../../database/database.module';
import { pcDevices, pcCommands } from '../../database/schema';
import { v4 as uuidv4 } from 'uuid';

const COMMAND_TIMEOUT_MS = 30_000;

@Injectable()
export class PcConnectorService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async generatePairingToken(tenantId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const id = uuidv4();

    await this.db.insert(pcDevices).values({
      id,
      tenantId,
      deviceName: 'Aguardando pareamento...',
      platform: 'windows',
      pairingToken: token,
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
      .where(eq(pcDevices.pairingToken, token));

    if (!device) throw new NotFoundException('Pairing token not found');
    if (!device.pairingExpiresAt || device.pairingExpiresAt < new Date()) {
      throw new BadRequestException('Pairing token expired');
    }
    if (device.pairedAt) throw new BadRequestException('Already paired');

    const deviceSecret = randomBytes(32).toString('hex');
    const deviceSecretHash = createHash('sha256').update(deviceSecret).digest('hex');

    const now = new Date();
    await this.db
      .update(pcDevices)
      .set({
        deviceName,
        platform,
        pairingToken: null,
        deviceSecretHash,
        pairedAt: now,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(pcDevices.id, device.id));

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

  async disconnectDevice(tenantId: string, deviceId: string) {
    const [device] = await this.db
      .select({ id: pcDevices.id })
      .from(pcDevices)
      .where(and(eq(pcDevices.id, deviceId), eq(pcDevices.tenantId, tenantId)));

    if (!device) throw new NotFoundException('Device not found');
    await this.db.delete(pcDevices).where(eq(pcDevices.id, deviceId));
  }

  async updateCapabilities(
    tenantId: string,
    deviceId: string,
    capabilities: Record<string, unknown>,
  ) {
    const [device] = await this.db
      .select({ id: pcDevices.id })
      .from(pcDevices)
      .where(and(eq(pcDevices.id, deviceId), eq(pcDevices.tenantId, tenantId)));

    if (!device) throw new NotFoundException('Device not found');
    await this.db
      .update(pcDevices)
      .set({ capabilities: capabilities as never, updatedAt: new Date() })
      .where(eq(pcDevices.id, deviceId));
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

    return this.waitForResult(commandId);
  }

  private async waitForResult(commandId: string): Promise<PcCommandResult> {
    const deadline = Date.now() + COMMAND_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const [cmd] = await this.db.select().from(pcCommands).where(eq(pcCommands.id, commandId));

      if (!cmd) throw new NotFoundException('Command not found');
      if (cmd.status === 'completed')
        return { success: true, result: cmd.result as Record<string, unknown> };
      if (cmd.status === 'failed') return { success: false, error: cmd.error ?? 'Unknown error' };

      await sleep(500);
    }

    await this.db
      .update(pcCommands)
      .set({ status: 'timeout', completedAt: new Date() })
      .where(eq(pcCommands.id, commandId));

    return { success: false, error: 'Command timed out — PC Connector did not respond in 30s' };
  }

  async approveCommand(
    tenantId: string,
    commandId: string,
    approved: boolean,
  ): Promise<{ commandId: string; status: string }> {
    const [cmd] = await this.db
      .select()
      .from(pcCommands)
      .where(and(eq(pcCommands.id, commandId), eq(pcCommands.tenantId, tenantId)));

    if (!cmd) throw new NotFoundException('Command not found');
    if (cmd.status !== 'awaiting_approval') {
      throw new BadRequestException(
        `Command is in '${cmd.status}' state — only awaiting_approval commands can be reviewed`,
      );
    }

    if (!approved) {
      await this.db
        .update(pcCommands)
        .set({ status: 'rejected', completedAt: new Date() })
        .where(eq(pcCommands.id, commandId));
      return { commandId, status: 'rejected' };
    }

    // Approved: move to pending so the device picks it up
    await this.db
      .update(pcCommands)
      .set({ status: 'pending', requiresApproval: false })
      .where(eq(pcCommands.id, commandId));

    return { commandId, status: 'pending' };
  }

  private async verifyDeviceSecret(deviceId: string, secret: string | undefined): Promise<void> {
    if (!secret) throw new UnauthorizedException('X-Device-Secret header is required');
    const [device] = await this.db
      .select({ deviceSecretHash: pcDevices.deviceSecretHash })
      .from(pcDevices)
      .where(eq(pcDevices.id, deviceId));
    if (!device?.deviceSecretHash) throw new UnauthorizedException('Device not paired');
    const incoming = createHash('sha256').update(secret).digest('hex');
    if (incoming !== device.deviceSecretHash)
      throw new UnauthorizedException('Invalid device secret');
  }

  async getPendingCommands(deviceId: string, deviceSecret: string | undefined) {
    await this.verifyDeviceSecret(deviceId, deviceSecret);

    await this.db
      .update(pcDevices)
      .set({ lastSeenAt: new Date() })
      .where(eq(pcDevices.id, deviceId));

    return this.db
      .select()
      .from(pcCommands)
      .where(and(eq(pcCommands.deviceId, deviceId), inArray(pcCommands.status, ['pending'])));
  }

  async postCommandResult(
    deviceId: string,
    commandId: string,
    success: boolean,
    result?: Record<string, unknown>,
    error?: string,
    deviceSecret?: string,
  ) {
    await this.verifyDeviceSecret(deviceId, deviceSecret);
    const [cmd] = await this.db
      .select({ id: pcCommands.id, deviceId: pcCommands.deviceId })
      .from(pcCommands)
      .where(eq(pcCommands.id, commandId));

    if (!cmd || cmd.deviceId !== deviceId) throw new NotFoundException('Command not found');

    await this.db
      .update(pcCommands)
      .set({
        status: success ? 'completed' : 'failed',
        result: (result ?? null) as never,
        error: error ?? null,
        completedAt: new Date(),
      })
      .where(eq(pcCommands.id, commandId));
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
