# Produção na VPS

Esta configuração executa uma instância do Pop Organize em Node.js, atrás do Nginx,
com MySQL local e inicialização automática pelo systemd.

## 1. Pacotes e diretórios

Use Ubuntu Server 24.04 LTS, Node.js 24 LTS e um usuário Linux chamado `deploy`.

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl ufw openssl
sudo mkdir -p /var/www/pop-organize
sudo chown deploy:deploy /var/www/pop-organize
```

Clone o repositório privado usando uma deploy key do GitHub. Nunca coloque token ou senha
diretamente no comando de clone.

## 2. MySQL

Gere uma senha segura que possa ser usada diretamente na URL:

```bash
openssl rand -hex 24
sudo mysql
```

```sql
CREATE DATABASE pop_organize CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'poporganize'@'localhost' IDENTIFIED BY 'SENHA_GERADA';
GRANT ALL PRIVILEGES ON pop_organize.* TO 'poporganize'@'localhost';
FLUSH PRIVILEGES;
```

Não exponha a porta 3306 na internet.

## 3. Ambiente e build

Copie `deploy/pop-organize.env.example` para `/etc/pop-organize.env`, substitua todos os
placeholders e proteja o arquivo:

```bash
openssl rand -hex 32
sudo chown root:deploy /etc/pop-organize.env
sudo chmod 0640 /etc/pop-organize.env

cd /var/www/pop-organize
set -a
source /etc/pop-organize.env
set +a
npm ci --include=dev --include=optional
npm run check
```

`AUTH_PASSWORD_PEPPER` deve permanecer igual durante toda a vida do banco. Trocar esse valor
invalida senhas existentes.

## 4. systemd e Nginx

```bash
sudo cp deploy/pop-organize.service /etc/systemd/system/pop-organize.service
sudo systemctl daemon-reload
sudo systemctl enable --now pop-organize

sudo cp deploy/nginx-pop-organize.conf /etc/nginx/sites-available/pop-organize
sudo nano /etc/nginx/sites-available/pop-organize
sudo ln -s /etc/nginx/sites-available/pop-organize /etc/nginx/sites-enabled/pop-organize
sudo nginx -t
sudo systemctl reload nginx
```

Troque `app.seudominio.com.br` no Nginx antes de recarregar. No Cloudflare, crie primeiro um
registro `A` para o subdomínio apontando para o IPv4 da VPS. Deixe-o temporariamente como
**Somente DNS** (nuvem cinza), confirme que a porta 80 responde e instale HTTPS:

```bash
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/local/bin/certbot
sudo certbot --nginx -d app.seudominio.com.br
sudo certbot renew --dry-run
```

Depois que o certificado estiver funcionando:

1. Ative **Proxied** no registro DNS (nuvem laranja).
2. Em **SSL/TLS**, selecione **Full (strict)**.
3. Não use o modo Flexible, pois a conexão entre Cloudflare e a VPS também precisa ser HTTPS.

No Google Cloud, adicione `https://app.seudominio.com.br` como origem JavaScript autorizada do
novo cliente Web OAuth.

## 5. Verificação e atualização

```bash
curl --fail https://app.seudominio.com.br/api/health
sudo journalctl -u pop-organize -f
chmod +x deploy/release.sh
deploy/release.sh
```

O endpoint `/api/health` só responde `200` quando a configuração e o MySQL estão saudáveis.

## 6. Backup diário

Crie `/root/.my.cnf` com permissão `0600`:

```ini
[client]
user=poporganize
password=SENHA_GERADA
host=127.0.0.1
```

Instale e agende o script:

```bash
sudo install -m 0700 deploy/backup-mysql.sh /usr/local/sbin/backup-pop-organize
sudo crontab -e
```

Exemplo de cron para 03:15 todos os dias:

```cron
15 3 * * * /usr/local/sbin/backup-pop-organize >> /var/log/pop-organize-backup.log 2>&1
```

Copie os backups para outro provedor ou armazenamento. Um backup mantido somente na mesma VPS
não protege contra perda total do servidor.

## Arquitetura multiempresa

Use somente esta instalação e este banco para atender todos os clientes. As contas são globais,
mas tarefas, equipes, setores, grupos, convites e permissões ficam isolados pelo espaço/empresa
ativo. Não crie uma VPS ou um banco separado para cada empresa.
