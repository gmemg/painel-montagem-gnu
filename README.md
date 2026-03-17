# Painel de Montagem de Eletrônicos

Sistema de gerenciamento de tarefas de montagem de eletrônicos com interface moderna e funcionalidades completas.

## Funcionalidades

- Adicionar eventos de montagem
- Editar eventos existentes
- Remover eventos
- Visualizar histórico completo de eventos
- Interface responsiva e moderna
- Armazenamento local (localStorage)

## Tecnologias

- React 18
- TypeScript
- Vite
- React Router DOM

## Estrutura do Projeto

```
src/
├── components/
│   ├── Painel.tsx           # Painel principal com tabela de eventos
│   ├── FormularioEvento.tsx # Formulário para adicionar/editar
│   ├── Historico.tsx        # Página de histórico
│   └── *.css                # Estilos dos componentes
├── utils/
│   ├── storage.ts           # Funções de armazenamento
│   └── dateUtils.ts         # Utilitários de data
├── types.ts                 # Tipos TypeScript
├── App.tsx                  # Componente principal
└── main.tsx                 # Ponto de entrada
```

## Campos da Montagem

- Nome do Evento (obrigatório)
- Data e Hora (obrigatório)
- Dia da Semana (calculado automaticamente)
- Local do Evento (obrigatório)
- Funcionário de Plantão
- Equipamentos Necessários
- Número do Chamado

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Preview do build de produção
