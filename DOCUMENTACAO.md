# Documentação do Projeto - Painel de Montagem

## Visão Geral

Aplicação web para gerenciamento de eventos de montagem. A tela principal mantém somente eventos ativos (não removidos) e a tela de histórico consolida eventos removidos/concluídos com registros ainda presentes em `eventos_montagem`, garantindo rastreabilidade mesmo sem backend. Todos os dados são persistidos no `localStorage` do navegador.

## Tecnologias

- React 18 (componentes funcionais e hooks)
- TypeScript (tipagem do domínio e props)
- Vite (build e dev server)
- React Router DOM (rotas `/` e `/historico`)
- CSS por componente

## Estrutura do Projeto

- `src/components/Painel.tsx` lista eventos ativos e orquestra criação/edição/remoção lógica.
- `src/components/FormularioEvento.tsx` formulário controlado para criar/editar eventos.
- `src/components/Historico.tsx` consolida histórico e permite remoções definitivas.
- `src/utils/storage.ts` encapsula leitura/escrita no `localStorage`.
- `src/utils/dateUtils.ts` formata datas e aplica regras de proximidade.
- `src/types.ts` define o contrato `Evento`.
- `src/App.tsx` define layout e rotas.
- `src/main.tsx` inicializa o app.
- `vite.config.ts` configura o bundler.

## Como Rodar

Instalação:

```bash
npm install
```

Configuração:

- Não há variáveis de ambiente.
- Persistência local via `localStorage`.

Execução:

```bash
npm run dev
```

Build de produção:

```bash
npm run build
```

Preview do build:

```bash
npm run preview
```

## Funcionalidades

- CRUD de eventos (criação, edição e remoção lógica).
- Conclusão de eventos com remoção da lista ativa.
- Histórico consolidado com status e data de remoção/conclusão.
- Destaque visual de eventos que ocorrem em até 2 dias.
- Atalhos de teclado: `Escape` fecha modais/formulário e `Enter` confirma remoção.

## Arquitetura

Módulos principais:

- `Painel` carrega eventos ativos com `getEventos()` e filtra `removido: false`.
- `FormularioEvento` produz um `Evento` completo (inclui `diaSemana`) e delega persistência para o `Painel`.
- `Historico` reconcilia dados de `getHistorico()` com eventos removidos atuais, desduplicando por `id`.
- `storage.ts` centraliza a persistência para reduzir acoplamento com `localStorage`.

Fluxo de dados:

- `FormularioEvento` emite `Evento` → `Painel` decide criar/editar → `saveEventos()` persiste.
- `Painel` marca `removido`/`concluido` → `addToHistorico()` registra histórico.
- `Historico` monta lista única via `Map<id, Evento>` e ordena por `dataHora` descendente.

## API

Sem API externa. Persistência local via `localStorage`:

- `eventos_montagem`: lista completa de eventos (ativos e removidos).
- `historico_eventos`: lista de eventos removidos/concluídos (sem duplicidade por `id`).
- `historico_removidos_count`: contador de exclusões definitivas do histórico.

## Pontos Importantes

- Remoção padrão é lógica (`removido: true`), preservando auditoria.
- Conclusão também marca como removido e registra `dataConclusao`/`dataRemocao`.
- A regra de “até 2 dias” zera horas para comparar apenas datas, evitando falsos positivos por horário.
- O histórico desduplica por `id` para evitar entradas repetidas quando o evento está em mais de uma fonte.
