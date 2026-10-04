// Carica le variabili del file .env dentro process.env.
// Deve stare in cima, prima dei require che leggono quelle variabili
require('dotenv').config()

const app = require('./app')
const { db } = require('./db')

// In locale uso la 3000, online la porta la decide la piattaforma di deploy
const port = process.env.PORT || 3000

// Controllo all'avvio che il database risponda
db.command({ ping: 1 })
  .then(() => {
    console.log('Connessione a MongoDB riuscita')
  })
  .catch((error) => {
    console.log('Errore di connessione a MongoDB: ' + error.message)
  })

app.listen(port, () => {
  console.log('Server in ascolto sulla porta ' + port)
})
