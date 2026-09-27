// Carica le variabili del file .env dentro process.env
require('dotenv').config()

const app = require('./app')

// In locale uso la 3000, online la porta la decide la piattaforma di deploy
const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log('Server in ascolto sulla porta ' + port)
})
