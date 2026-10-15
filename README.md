# Lotto Drawing Program

Program do losowego generowania liczb oraz prowadzenia archiwum losowan Lotto, Mini Lotto i Euro Jackpot.

## Technologie

- Backend: Spring Boot, Java 17, MySQL
- Frontend: React + Vite

## Backend

Utworz baze MySQL:

```sql
CREATE DATABASE lotto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Domyslna konfiguracja laczy sie z:

```text
jdbc:mysql://localhost:3306/lotto
user: root
password: pusty
```

Bezpieczniej ustawic dane przez zmienne srodowiskowe:

```powershell
$env:LOTTO_DB_URL="jdbc:mysql://localhost:3306/lotto_drawing_program?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Europe/Warsaw"
$env:LOTTO_DB_USER="twoj_user"
$env:LOTTO_DB_PASSWORD="twoje_haslo"
```

Uruchom w IntelliJ klase:

```text
lotto.drawing.program.LottoDrawingProgramApplication
```

API:

```text
POST http://localhost:8081/api/draw?gameType=LOTTO
POST http://localhost:8081/api/draw?gameType=MINI_LOTTO
POST http://localhost:8081/api/draw?gameType=EURO_JACKPOT
GET  http://localhost:8081/api/archive?gameType=LOTTO
POST http://localhost:8081/api/archive
POST http://localhost:8081/api/archive/import
```

Format CSV do importu archiwum:

```csv
gameType,drawDate,numbers,extraNumbers
LOTTO,2026-07-02,"4,12,19,27,36,44",
MINI_LOTTO,2026-07-02,"3,9,18,29,37",
EURO_JACKPOT,2026-06-30,"8,15,22,37,49","4,11"
```

## Frontend

PowerShell moze blokowac `npm`, dlatego uzywaj `npm.cmd`:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend:

```text
http://localhost:5173
```
