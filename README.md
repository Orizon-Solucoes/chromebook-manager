# 💻 Chromebook Manager

Sistema web para gerenciamento de equipamentos de TI, manutenção e gastos em ambiente escolar.

O **Chromebook Manager** está em desenvolvimento e busca centralizar o cadastro do patrimônio, o acompanhamento dos reparos e a consulta dos custos de manutenção. O projeto também está sendo preparado para atender mais de uma unidade escolar, com acesso definido pelas permissões de cada usuário.

## ✨ Módulos e funcionalidades

### 📦 Equipamentos

- Cadastro, consulta e edição de equipamentos.
- Pesquisa por informações do equipamento, como identificação, modelo, número de série, MAC e localização, conforme os campos disponíveis.
- Filtros por tipo e situação.
- Acompanhamento de equipamentos disponíveis, em uso, em reserva, em reparo e destinados ao descarte, conforme os fluxos implementados.

### 🔧 Manutenção e reparos

- Registro e consulta do histórico de manutenção.
- Acompanhamento de envios para reparo e retornos.
- Registro e consulta de custos relacionados aos serviços.
- Consulta dos registros associados a cada equipamento.

### 📊 Dashboard e relatórios

- Indicadores gerais dos equipamentos e das manutenções.
- Relatório de gastos com filtros.
- Consulta de custos por período e equipamento.
- Exportação CSV nas áreas em que a opção está disponível.

### 🎨 Interface

- Tema claro e escuro.
- Interface responsiva.
- Navegação entre os módulos do sistema.

> **Status:** projeto em desenvolvimento. A lista de módulos e recursos pode mudar conforme as funcionalidades forem implementadas e testadas.

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
- Não compartilhe nem envie o arquivo `.env.local para o GitHub. Ele contém credenciais.
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

O projeto utiliza conexão com banco de dados MySQL/TiDB configurada por variáveis de ambiente. Os dados persistidos no banco podem ser compartilhados entre ambientes autorizados que utilizem a mesma base.

O sistema está sendo preparado para separar os dados de **Campos Elíseos** e **Jardim Primavera**, permitindo que funcionários acessem a unidade correspondente e que administradores autorizados tenham uma visão consolidada. O isolamento e as permissões precisam ser validados em cada fluxo antes de considerar essa parte concluída.

Faça alterações no banco com cuidado e mantenha um backup antes de mudanças estruturais ou operações em massa.

## 🧭 Melhorias planejadas

- Aperfeiçoar a navegação entre a Dashboard e as listas por tipo de equipamento.
- Melhorar a legibilidade de botões e controles de interface.
- Concluir a unificação dos dados e do histórico na tela do equipamento e validar o retorno à lista anterior.
- Filtrar os equipamentos disponíveis para cadastro de retorno do reparo.
- Revisar os relatórios de gastos e as permissões por unidade.
- Evoluir os módulos de equipamentos gerais e estoque de peças e consumíveis.

As tarefas acima representam melhorias planejadas e não devem ser interpretadas como recursos já concluídos.

## 📁 Estrutura geral

```text
chromebook-manager/
├── src/
│   ├── app/          # Páginas, rotas e APIs
│   ├── components/   # Componentes da interface
│   ├── lib/          # Banco de dados e regras compartilhadas
│   └── types/        # Tipos e interfaces TypeScript
├── public/           # Arquivos estáticos
├── package.json      # Dependências e scripts
├── pnpm-lock.yaml    # Versões resolvidas das dependências
└── README.md         # Documentação do projeto
```

## 🌐 Links do projeto

- **Repositório:** [github.com/yagodiax/chromebook-manager](https://github.com/yagodiax/chromebook-manager)
- **Aplicação:** [Abrir o Chromebook Manager](https://chromebook-manager-khaki.vercel.app/)

## 🎯 Objetivo

Ajudar a equipe de TI escolar a organizar o patrimônio tecnológico, acompanhar manutenções e reparos e consultar os gastos, com atenção à segurança dos dados, às permissões e à separação entre unidades.

---

**Chromebook Manager** 💻 — projeto em evolução.
