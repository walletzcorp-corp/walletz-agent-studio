# Tokens Visuais — Walletz Med

**Data:** 2026-10-01

## Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| `brand-emerald` | `#10B981` | Cor primária da marca (logo, links ativos) |
| `brand-graphite` | `#1F2937` | Fundo do sidebar |
| `brand-graphite-mid` | `#374151` | Bordas do sidebar |
| `brand-white` | `#FFFFFF` | Fundo principal |
| `brand-surface` | `#F9FAFB` | Fundo de cards e tabelas |

## Status Clínico (badges)

| Contexto | Cor de fundo | Cor de texto | Uso |
|---|---|---|---|
| Sucesso/Concluído | `bg-green-100` | `text-green-700` | CONCLUIDO, LIBERADO, PUBLICADO |
| Atenção/Pendente | `bg-yellow-100` | `text-yellow-700` | PENDENTE, EM_ANALISE, PAUSADO |
| Alerta/Alto | `bg-red-100` | `text-red-700` | VENCIDA, REJEITADA, CRITICO |
| Informação/Em andamento | `bg-blue-100` | `text-blue-700` | ENVIADO, VALIDADO, ATIVO |
| Neutro/Rascunho | `bg-gray-100` | `text-gray-500` | RASCUNHO, CANCELADO, RETIRADO |
| Processo/Intermediário | `bg-indigo-100` | `text-indigo-700` | APROVADO, EM_PROCESSAMENTO |
| Alerta secundário | `bg-orange-100` | `text-orange-700` | RETIFICADO, EXECUTANDO |
| Destaque/Especial | `bg-purple-100` | `text-purple-700` | — |

## Alertas Clínicos

Usados para notificações que exigem ação humana antes de prosseguir:

```html
<!-- Aviso amarelo — pendência não bloqueante -->
<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
  <p class="font-medium text-yellow-800">...</p>
</div>

<!-- Alerta vermelho — bloqueante / crítico -->
<div class="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
  <span class="text-red-600 text-lg">⚠</span>
  <div>...</div>
</div>
```

## Tipografia

| Elemento | Classe Tailwind | Uso |
|---|---|---|
| Título de página (H1) | `text-2xl font-bold text-gray-900` | Cabeçalho de módulo |
| Subtítulo | `text-sm text-gray-500 mt-1` | Descrição do módulo |
| Label de KPI | `text-xs text-gray-500 mb-1` | Rótulo de card |
| Valor de KPI | `text-2xl font-bold` | Número principal de card |
| Texto de tabela | `text-sm` | Conteúdo de células |
| Texto de aviso clínico | `text-xs text-amber-600` | Disclaimers de segurança |
| Código / ID | `font-mono text-xs` | IDs, barcodes, slugs |

## Layout

- Padding externo de página: `p-6`
- Largura máxima: `max-w-6xl mx-auto`
- Grid de KPI cards: `grid grid-cols-2 md:grid-cols-4 gap-4`
- Cards: `bg-white rounded-lg border p-4`
- Tabelas: `bg-white rounded-lg border overflow-hidden`
- Cabeçalho de tabela: `bg-gray-50`
- Divisor de linha: `divide-y`

## Componentes de Navegação

### Tabs
```html
<div class="border-b mb-6">
  <nav class="flex gap-1">
    <!-- ativo -->
    <button class="px-4 py-2 text-sm font-medium rounded-t bg-white border border-b-white -mb-px text-blue-700">
    <!-- inativo -->
    <button class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
  </nav>
</div>
```

### Sidebar Link (ativo)
Definido em `globals.css` via `.sidebar-link.active` com emerald border-left e fundo ligeiramente claro.

## Avisos de Segurança Clínica

Todos os módulos clínicos incluem um aviso `text-xs text-amber-600` ou `text-xs text-gray-400` comunicando restrições ao usuário. Exemplos:

- M14 MED: "O sistema auxilia a execução; não substitui julgamento clínico."
- M15 QUA: "Notificação regulatória preparada para revisão humana."
- M19 DIA: "O sistema registra pedidos e resultados — não interpreta exame nem oferece diagnóstico autônomo."
- M20 NCD: "Simulações usam apenas dados fictícios — nunca dados reais de pacientes."
- M21 MIG: "Toda importação começa com validação e simulação — carga real requer aprovação explícita."
