# IncluDO Chatbot

Chatbot di orientamento per IncluDO, scuola che insegna mestieri artigianali
tradizionali a migranti e persone in cerca di una nuova opportunità di lavoro.
Fa una domanda alla volta e, quando conosce il profilo dell'utente, consiglia al
massimo due corsi del catalogo.

Progetto del corso Agenti AI per Sviluppo del Master Web Developer Full Stack di
start2impact.

- Chat online: https://includo-chatbot.netlify.app
- Server: https://includo-chatbot-server.onrender.com/api/health

Il server è su un piano gratuito che si sospende dopo 15 minuti di inattività:
il primo messaggio può impiegare circa un minuto.

## Come funziona

Vue.js (`client/`), Node.js con Express (`server/`), OpenAI e MongoDB Atlas con
Vector Search. La ricerca dei corsi è un tool del modello, `searchCourses`: il
modello la chiama una volta sola, quando ha raccolto tutte le informazioni.

## Avvio in locale

Servono Node.js 20 o superiore, una chiave API di OpenAI e un cluster MongoDB
Atlas.

```
cd server
npm install
cp .env.example .env
npm run dev
```

In `.env` vanno `OPENAI_API_KEY` e `MONGODB_URI`. La prima volta, con il server
acceso, si caricano i corsi e si crea l'indice:

```
curl -X POST http://localhost:3000/api/courses/ingest -H "Content-Type: application/json" --data-binary @data/courses.json
npm run create-index
```

Poi, in un secondo terminale:

```
cd client
npm install
npm run dev
```

## Note

- Il system prompt e la conversazione stanno sul server: il client manda solo
  il messaggio dell'utente.
- Sotto un punteggio di somiglianza di 0.72 un corso non viene proposto, e il
  chatbot dice quando nessun corso è adatto invece di inventarne uno.
- Se OpenAI o il database non rispondono, l'utente riceve un messaggio chiaro.
