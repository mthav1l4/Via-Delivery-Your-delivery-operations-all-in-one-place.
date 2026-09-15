# Via Delivery

Aplicativo web de gestão de entregas, com interface para celular, escrito em TypeScript e React. Usa Next.js no servidor, SQLite e armazenamento local de documentos. Não precisa de serviços de IA nem de uma plataforma de criação de sites.

## Abrir no VS Code

1. Instale Node.js 24 ou superior e Git.
2. Extraia o ZIP e abra a pasta `via-delivery` no VS Code, ou abra `via-delivery.code-workspace`.
3. No terminal, execute `npm ci`.
4. Copie `.env.example` para `.env.local`.
5. Crie seu administrador: `npm run admin:create -- seu@email.com "Seu nome"`.
6. Guarde a senha gerada e execute `npm run dev`.
7. Abra http://localhost:3000/login e entre com o administrador criado.

No Windows, use `Copy-Item .env.example .env.local` para copiar a configuração. No Linux/macOS, use `cp .env.example .env.local`.

Defina região, setores e preços em Configurações. Cada empresa/entregador cria uma conta e completa seu cadastro; o administrador confere a identidade e aprova o acesso. Não há aprovação automática por endereço de e-mail, nem dados fictícios iniciais.

## Comandos

- `npm run dev`: desenvolvimento local.
- `npm run build`: compilação de produção.
- `npm start`: execução da versão compilada.
- `npm run typecheck`: verificação TypeScript.
- `npm test`: integração HTTP com banco isolado; execute o build antes.
- `npm run format`: formatação com Prettier.
- `npm run admin:create -- email "Nome"`: cria administrador pelo terminal do servidor.

O usuário pode alterar sua senha em Configurações. Para recuperação assistida, o responsável pelo servidor pode executar `node --env-file-if-exists=.env.local scripts/reset-password.mjs email`. Confira a identidade antes de entregar a nova senha. Não existe recuperação automática por e-mail nesta versão.

## Estrutura

```text
app/                 Telas, layout e endpoints HTTP
components/ui/       Componentes de interface
hooks/               Hooks React
lib/operation.ts     Tipos, preços e regras de prioridade
lib/server/          Autorização e visibilidade dos dados
server/              SQLite, senhas, sessões e arquivos
scripts/             Administração pelo terminal
tests/               Testes de integração
public/              Ícones e manifesto do aplicativo
docs/                Documentação de arquitetura e hospedagem
```

## Funcionalidades

Contas com e-mail/senha, aprovação, documentos privados, pedidos, aceite, retirada, conclusão, estorno, saldo pré-pago, ganhos/comissão, relatórios CSV, planos, escalas e avisos internos. Os dados ficam persistidos em `data/`, fora dos arquivos públicos.

Recargas e repasses são registros MANUAIS de movimentações já confirmadas no banco, com referência única. O sistema calcula elegibilidade D+1, mas não recebe nem transfere dinheiro. PIX, cartão, split, WhatsApp, push, mapas/GPS e rotinas agendadas ainda precisam de integração. Os alertas de escalas são avaliados nas consultas da central.

## GitHub

Crie um repositório vazio na sua conta. Abra o terminal na pasta do projeto:

```sh
git init
git add .
git commit -m "Adiciona Via Delivery"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Substitua os nomes pelo seu repositório. Não use `push --force` em um repositório que já contém trabalho. O `.gitignore` exclui senhas, banco, documentos enviados e dependências.

## Hospedagem

Use um servidor Node.js com disco persistente. GitHub Pages não executa este backend. Consulte `docs/HOSPEDAGEM.md` para HTTPS, volumes e cópias de segurança. Esta versão usa um registro JSON compartilhado para a operação; para grande volume, normalize as tabelas e valide capacidade/carga antes de escalar.
