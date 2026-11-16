import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerDto } from '../dto/admin.dto';

async function errorsOf(body: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateCustomerDto, body);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

const pf = { type: 'pf', name: 'Maria da Silva', taxId: '529.982.247-25', email: 'maria@email.com', password: 'senha-forte-1' };

describe('CreateCustomerDto', () => {
  it('aceita pessoa física válida', async () => {
    expect(await errorsOf(pf)).toEqual([]);
  });

  it('recusa CPF inválido com mensagem clara', async () => {
    expect(await errorsOf({ ...pf, taxId: '529.982.247-24' })).toContain('CPF inválido');
  });

  it('recusa CNPJ no lugar de CPF para pessoa física', async () => {
    expect(await errorsOf({ ...pf, taxId: '11.222.333/0001-81' })).toContain('CPF inválido');
  });

  it('PJ exige CNPJ válido e nome do responsável', async () => {
    const pj = { ...pf, type: 'pj', name: 'Empresa X', taxId: '11.222.333/0001-81' };
    expect(await errorsOf(pj)).toContain('Informe o nome do responsável');
    expect(await errorsOf({ ...pj, contactName: 'João Souza' })).toEqual([]);
    expect(await errorsOf({ ...pj, contactName: 'João Souza', taxId: '529.982.247-25' })).toContain('CNPJ inválido');
  });

  it('recusa tipo desconhecido e campos extras (ex.: tentar definir plano ou status)', async () => {
    expect(await errorsOf({ ...pf, type: 'xx' })).toContain('Tipo deve ser pf ou pj');
    const extra = await errorsOf({ ...pf, status: 'active', llmMonthlyTokenLimit: 999999999 });
    expect(extra.join(' ')).toMatch(/should not exist/);
  });
});
