# Nova Web Interface - Debian 13 Deployment Guide 🛡️🖥️

Ez az útmutató segít a webes admin felület élesítésében egy olyan Debian 13-as szerveren, ahol a bot és az adatbázis már fut.

## 1. Node.js Telepítése (Debian 13)

A Debian 13 alap lerakatai néha régebbi verziókat tartalmaznak, ezért a NodeSource hivatalos scripjét használjuk a legfrissebb stabil (LTS) verzióhoz:

```bash
# Frissítés és alapvető eszközök
sudo apt update
sudo apt install -y curl git build-essential

# Node.js 20.x (LTS) telepítése
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Ellenőrzés
node -v
npm -v
```

## 2. Projekt letöltése és függőségek

Lépj be a projekt mappájába, majd telepítsd a webes csomagokat:

```bash
cd /eleresi/ut/a/discord-feed-bot/web
npm install
```

## 3. Környezeti változók beállítása (ENV)

Hozd létre a `web/.env.local` fájlt a szerveren, és másold bele a következőt (az adataidat a helyi gépedről már behelyettesítettem):

```bash
nano .env.local
```

**Tartalom:**
```env
DISCORD_CLIENT_ID="YOUR_DISCORD_CLIENT_ID"
DISCORD_CLIENT_SECRET="YOUR_DISCORD_CLIENT_SECRET"
# Élesben ide a szervered IP-jét vagy domain nevét írd! (pl. http://1.2.3.4:3000)
NEXTAUTH_URL="http://your-server-ip:3000"
NEXTAUTH_SECRET="aRandomSecureSecretForNextAuth"
# Itt ellenőrizd az adatbázis jelszavadat a szerveren!
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/feed_bot"
BOT_TOKEN="YOUR_BOT_TOKEN"
```

## 4. Éles Build (Production Build)

A fejlesztői mód helyett élesben le kell fordítani a kódot a maximális sebesség érdekében:

```bash
npm run build
```

## 5. Folyamatkezelés PM2-vel

Hogy a weboldal a háttérben fusson és újrainduljon hiba esetén:

```bash
# PM2 telepítése globálisan
sudo npm install -g pm2

# Indítás a web mappából
pm2 start npm --name "nova-web" -- start

# Automatikus indítás beállítása rendszerindításkor
pm2 save
pm2 startup
# (Végezd el a képernyőn megjelenő utolsó parancsot, amit a pm2 startup dob!)
```

## 6. Portok ellenőrzése
Alapértelmezetten a webes felület a **3000**-es porton fut. Győződj meg róla, hogy a tűzfaladon (pl. `ufw`) engedélyezve van:

```bash
sudo ufw allow 3000/tcp
```

---
**Kész!** A webes felületed most már élesben fut a Debian 13-as szervereden. 🚀🛡️
