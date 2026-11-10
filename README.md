# 💻 Chromebook Manager

Sistema web para gerenciamento de equipamentos de TI, manutenção e gastos em ambiente escolar.

O **Chromebook Manager** centraliza o cadastro do patrimônio, o acompanhamento de manutenções e reparos e a consulta dos custos. O sistema atende as unidades Campos Elíseos (CE) e Jardim Primavera (JP), com acesso controlado por usuário e unidade.

## ✨ Módulos e funcionalidades

### 📦 Equipamentos

- Cadastro, consulta, edição e exclusão de equipamentos.
- Inventário unificado para Chromebooks, notebooks, projetores, catracas, impressoras e Access Points.
- Pesquisa por identificação, modelo, número de série, MAC e localização, conforme os campos disponíveis.
- Filtros por tipo e situação.
- Consulta dos equipamentos por unidade.

### 🔧 Manutenção e reparos

- Registro e consulta do histórico de serviços.
- Acompanhamento de envios para reparo e retornos.
- Registro de diagnóstico, descrição, responsável, destino e custos, conforme o tipo de registro.
- Anexos associados aos registros do histórico.

### 📊 Dashboard e relatórios

- Indicadores gerais dos equipamentos e dos serviços.
- Relatório de gastos com filtros por período e equipamento.
- Consulta de custos relacionados aos registros do histórico.
- Exportação CSV nas áreas em que a opção está disponível.

### 🎨 Interface

- Tema claro e escuro.
- Interface responsiva.
- Navegação entre os módulos do sistema.

> **Status:** projeto em desenvolvimento. As funcionalidades devem ser consideradas concluídas somente após validação no ambiente utilizado pela equipe.

## 🛠️ Tecnologias

| Tecnologia | Uso |
| --- | --- |
| [Next.js](https://nextjs.org/) | Framework da aplicação |
| [React](https://react.dev/) | Interface |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização |
| [MySQL](https://www.mysql.com/) / [TiDB Cloud](https://tidbcloud.com/) | Banco de dados |
| [mysql2](https://github.com/sidorares/node-mysql2) | Conexão com o banco |
| [pnpm](https://pnpm.io/) | Gerenciamento de dependências |
| [GitHub](https://github.com/yagodiax/chromebook-manager) | Versionamento do código |
| [Vercel](https://vercel.com/) | Hospedagem e implantação |

## 🚀 Como executar localmente no Windows

### Pré-requisitos

Instale os seguintes programas:

- [Node.js](https://nodejs.org/) — versão compatível com o projeto (Node.js 24 é utilizado no desenvolvimento).
- [Git](https://git-scm.com/).
- [pnpm](https://pnpm.io/).

Abra o **PowerShell** e confira as instalações:

```powershell
node -v
git --version
pnpm -v
```

Se o pnpm não estiver disponível, habilite-o pelo Corepack, se incluído na instalação do Node.js:

```powershell
corepack enable
corepack prepare pnpm@10.34.6 --activate
```

### 1. Baixar o projeto

```powershell
git clone https://github.com/yagodiax/chromebook-manager.git
cd chromebook-manager
```

Se a pasta já existir, entre nela em vez de clonar novamente:

```powershell
cd caminho\para\chromebook-manager
git pull
```

### 2. Instalar as dependências

```powershell
pnpm install
```

### 3. Configurar a conexão com o banco

A aplicação utiliza um banco MySQL compatível, configurado pelas variáveis de ambiente. Crie um arquivo chamado `.env.local` na raiz do projeto, no mesmo nível do `package.json`.

Use este modelo e preencha com os dados do banco autorizado para o ambiente:

```dotenv
DB_HOST=SEU_HOST_DO_BANCO
DB_PORT=4000
DB_USER=SEU_USUARIO
DB_PASSWORD=SUA_SENHA
DB_NAME=chromebook_manager
```

**Importante:**
- Substitua os valores de exemplo pelos dados corretos do banco.
- Não compartilhe nem envie o arquivo `.env.local` para o GitHub. Ele contém credenciais.
- Não coloque senhas diretamente no código-fonte.
- O banco precisa estar acessível a partir da sua conexão e o usuário precisa ter as permissões necessárias.
- Para executar localmente, solicite as credenciais ao responsável pelo projeto; elas não são incluídas neste README.

### 4. Iniciar em modo de desenvolvimento

```powershell
pnpm dev
```

Abra o endereço mostrado no terminal, normalmente:

```text
http://localhost:3000
```

Se a porta estiver ocupada, o Next.js pode escolher outra porta e informar o endereço no terminal.

### Outros comandos

```powershell
pnpm build
pnpm start
pnpm lint
```

- `pnpm build`: gera a versão de produção e ajuda a identificar erros de compilação.
- `pnpm start`: inicia a versão de produção já compilada.
- `pnpm lint`: executa o ESLint.

## 🔒 Segurança e privacidade

- Credenciais, arquivos `.env*`, backups do banco, dumps SQL com dados reais, endereços IP, MACs, números de série e detalhes da infraestrutura não devem ser versionados.
- Configure as credenciais somente nas variáveis de ambiente da hospedagem ou em `.env.local` (que permanece fora do Git).
- O repositório contém apenas código e scripts estruturais sem dados operacionais reais. Dados de inventário devem permanecer no banco de dados privado.
- Se uma credencial real já tiver sido enviada ao GitHub, removê-la do arquivo atual não apaga o histórico: revogue/rotacione a credencial e avalie a limpeza do histórico do Git.

## 🗄️ Dados e unidades escolares

A aplicação utiliza MySQL/TiDB. Os equipamentos são armazenados na tabela universal `equipamentos`; os registros de serviços e seus anexos ficam nas tabelas `historico_equipamentos` e `historico_equipamento_anexos`.

O sistema separa os dados de **Campos Elíseos (CE)** e **Jardim Primavera (JP)**. A unidade ativa é selecionada conforme as permissões da conta, e as APIs verificam no servidor se o usuário pode acessar a unidade solicitada. A seleção salva no navegador não substitui essa validação.

### Access Points

A migração de 09/11/2026 transferiu os Access Points para a tabela `equipamentos`, usando `tipo = 'access-point'`. O MAC fica em `mac_address`; os campos específicos, como bloco, rack e potência, ficam em `detalhes`.

A tabela antiga `access_points` foi excluída do banco após a migração e a validação inicial. As rotas atuais de APs utilizam a tabela `equipamentos`.

**Não execute novamente** `migrations/2026-11-09-unificar-access-points.sql`: o arquivo é o registro histórico da migração e não é idempotente. Ele adiciona coluna e índice e copia os registros da tabela antiga.

Antes de qualquer alteração estrutural, faça backup e confira o esquema diretamente no ambiente autorizado.

## 🧭 Melhorias planejadas

- Evoluir o acompanhamento de reparos, com etapas e informações específicas do atendimento.
- Refinar os relatórios financeiros para destacar custos efetivos de reparo.
- Melhorar a ficha individual dos equipamentos e adicionar QR Codes.
- Ampliar auditoria de ações e controles administrativos.
- Revisar desempenho, validações, testes e procedimentos de backup e recuperação.

As tarefas acima representam melhorias planejadas e não devem ser interpretadas como recursos já concluídos.

## 📁 Estrutura geral

```text
chromebook-manager/
├── database/       # Scripts estruturais e migrações
├── src/
│   ├── app/        # Páginas, rotas e APIs
│   ├── components/ # Componentes da interface
│   ├── lib/        # Banco de dados e regras compartilhadas
│   └── types/      # Tipos e interfaces
├── public/         # Arquivos estáticos
├── package.json    # Dependências e scripts
├── pnpm-lock.yaml  # Versões resolvidas das dependências
└── README.md       # Documentação do projeto
```

## 🌐 Links do projeto

- **Repositório:** [github.com/yagodiax/chromebook-manager](https://github.com/yagodiax/chromebook-manager)
- **Aplicação:** [Abrir o Chromebook Manager](https://chromebook-manager-khaki.vercel.app/)

## 🎯 Objetivo

Ajudar a equipe de TI escolar a organizar o patrimônio tecnológico, acompanhar manutenções e reparos e consultar os gastos, com atenção à segurança dos dados, às permissões e à separação entre unidades.

---

**Chromebook Manager** 💻 — projeto em evolução.
