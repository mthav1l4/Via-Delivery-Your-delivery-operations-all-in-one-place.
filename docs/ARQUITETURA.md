# Arquitetura

O navegador chama endpoints em app/api. As telas usam componentes React e estilos responsivos. A identidade vem de uma sessão com token aleatório, não de informações fornecidas em cabeçalhos pelo navegador.

server/security.mjs gerencia hash de senha, sessões e limitação de tentativas. Somente o comando local admin:create pode criar usuários administradores. As demais contas se cadastram e precisam de aprovação para acessar a operação.

lib/server/live.ts aplica as permissões por usuário e oculta dados privados de outras empresas. O endpoint operacional congela valores no momento do pedido, debita saldo e usa revisão otimista no SQLite: uma atualização concorrente pode retornar 409, permitindo atualizar a tela e tentar novamente sem duplicar lançamentos.

server/database.mjs cria o esquema inicial e usa consultas parametrizadas. server/storage.mjs grava documentos fora da pasta pública. app/api/documents protege os downloads.

A interface atual concentra a navegação operacional em app/console.tsx. As telas de acesso e os componentes de senha e saída ficam em arquivos próprios. É possível evoluir a divisão por módulos conforme o produto cresce.

Referências técnicas: https://nextjs.org/docs/app/api-reference/functions/cookies e https://nodejs.org/api/sqlite.html.
