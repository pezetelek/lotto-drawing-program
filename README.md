# Lotto Drawing Program

Program startowy do losowego generowania liczb dla Lotto i Mini Lotto.

## Technologie

- Backend: Spring Boot, Java 17
- Frontend: React + Vite

## Backend

Uruchom w IntelliJ klase:

```text
lotto.drawing.program.LottoDrawingProgramApplication
```

API:

```text
POST http://localhost:8081/api/draw?gameType=LOTTO
POST http://localhost:8081/api/draw?gameType=MINI_LOTTO
POST http://localhost:8081/api/draw?gameType=EURO_JACKPOT
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
