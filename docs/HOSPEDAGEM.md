# Hospedagem própria

Requer Node.js >=24, processo Node persistente e disco gravável. SQLite e documentos ficam em DATA_DIR. Não use hospedagem com disco efêmero nem múltiplas réplicas com discos diferentes.

1. Copie o código para o servidor e execute npm ci.
2. Crie .env.local com APP_URL=https://seu-dominio.com e DATA_DIR=/caminho/privado/via-data.
3. Execute npm run admin:create -- email "Nome". Não crie uma conta administradora com senha pública.
4. Execute npm run build e npm start com um gerenciador de processos do servidor.
5. Configure proxy reverso com HTTPS e o domínio de APP_URL; limite uploads a 6 MB e aplique limites de requisições no proxy.
6. Faça login, altere sua senha inicial, configure a operação e confira os primeiros cadastros.

APP_URL controla a origem aceita no login. Em HTTPS, o cookie de sessão recebe Secure. As sessões também são HttpOnly e SameSite=Lax; o banco guarda somente o hash do token. Senhas usam scrypt com salt individual. A aprovação operacional não substitui a conferência de identidade: não há verificação de e-mail nesta versão.

Os documentos não ficam em public/. O endpoint exige sessão e confere titularidade ou administrador. Mantenha DATA_DIR privado e protegido também no sistema operacional.

## Backup e restauração

Pare o aplicativo antes de copiar DATA_DIR inteiro, incluindo arquivos SQLite, WAL e documentos. Proteja a cópia e valide a restauração em uma instalação separada. Não publique backups no GitHub. Para backup online, implemente o mecanismo de snapshot do SQLite junto a uma política coerente para arquivos.

Ao atualizar o servidor, preserve DATA_DIR. As tabelas iniciais são criadas automaticamente. Mudanças futuras no esquema devem usar migrações versionadas, acompanhadas de backup e teste de restauração.

## Limites conhecidos

Sem cobrança ou transferência financeira automática, sem custódia/split, sem notificações externas nem tarefas em segundo plano. Sem permissões administrativas por região, GPS ou cobrança recorrente de planos. O armazenamento operacional em JSON e o limite global de autenticação destinam-se a uma instância de pequeno volume. Valide carga, monitore erros, defina retenção de dados e migre para tabelas normalizadas antes de ampliar.
