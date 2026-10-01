# Mapa Oficial dos Módulos — Walletz Med

Data de revisão: 2026-10-01

## Ordem canônica

| #  | Código | Nome completo                        | Status              |
|----|--------|--------------------------------------|---------------------|
| 1  | ORG    | Organização, unidades e acesso       | IMPLEMENTADO        |
| 2  | PAC    | Pacientes e consentimentos           | IMPLEMENTADO        |
| 3  | AGE    | Agenda e jornada operacional         | IMPLEMENTADO        |
| 4  | PEP    | Prontuário eletrônico do paciente    | IMPLEMENTADO        |
| 5  | DOC    | Documentos e prescrição              | NÃO IMPLEMENTADO    |
| 6  | TEL    | Telemedicina                         | NÃO IMPLEMENTADO    |
| 7  | EST    | Estoque, compras e rastreabilidade   | IMPLEMENTADO (M7)   |
| 8  | FIN    | Financeiro, fiscal e repasses        | IMPLEMENTADO (M8)   |
| 9  | TIS    | Convênios, TISS e Glosas             | IMPLEMENTADO (M9)   |
| 10 | CRM    | CRM e Comunicação Comercial          | IMPLEMENTADO (M10)  |
| 11 | IA     | Inteligência Artificial Clínica       | IMPLEMENTADO (M11)  |
| 12 | INT    | Integrações e Portal do Paciente      | IMPLEMENTADO (M12)  |
| 13 | SAL    | Salas, Poltronas e Fluxo Físico       | IMPLEMENTADO (M13)  |
| 14 | MED    | Segurança de Medicamentos             | IMPLEMENTADO (M14)  |
| 15 | QUA    | Qualidade e Segurança do Paciente     | IMPLEMENTADO (M15)  |
| 16 | ATI    | Ativos, Manutenção e Cadeia do Frio   | IMPLEMENTADO (M16)  |
| 17 | EQP    | Equipe, Escalas e Credenciais         | IMPLEMENTADO (M17)  |

## Divergência histórica de nomenclatura

Os primeiros seis commits usaram numeração interna (M1–M6) que não corresponde
à ordem canônica. A tabela abaixo mapeia os dois sistemas:

| Commit | Nome interno | Módulo canônico |
|--------|-------------|-----------------|
| M1     | Org/Units/Acesso   | ORG (1) |
| M2     | Profissionais/Recursos/Catálogo | ORG complementar (1) |
| M3/M6  | Agenda + gaps | AGE (3) |
| M4     | Prontuário | PEP (4) |
| M5     | Pacientes + consentimentos | PAC (2) |

## Módulos fora do escopo desta iteração

- **DOC (5)**: Documentos, prescrição digital, receituário controlado
- **TEL (6)**: Telemedicina, videoconferência integrada, consulta remota

Esses módulos não foram incluídos por falta de especificação técnica detalhada
no backlog original. Devem ser planejados na Sprint 2.
