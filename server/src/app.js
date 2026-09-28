const express = require('express')
const coursesRoutes = require('./routes/courses')

const app = express()

// Serve a leggere il corpo JSON delle richieste POST
app.use(express.json())

// Rotta di controllo: risponde se il server è acceso.
// Mi servirà anche su Render per verificare che il deploy sia andato a buon fine.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/courses', coursesRoutes)

// Nessuna delle rotte qui sopra ha risposto: l'indirizzo non esiste
app.use((req, res) => {
  res.status(404).json({ error: 'Risorsa non trovata' })
})

// Gestore centralizzato degli errori (si riconosce dai quattro parametri)
app.use((errore, req, res, next) => {
  if (errore.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Il corpo della richiesta non è JSON valido' })
  }

  console.log('Errore non previsto: ' + errore.message)
  res.status(500).json({ error: 'Errore interno del server' })
})

module.exports = app
