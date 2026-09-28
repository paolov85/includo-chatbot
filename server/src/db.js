const { MongoClient } = require('mongodb')

// Un solo client per tutta l'applicazione: gestisce da solo le connessioni
// verso Atlas e le riusa a ogni richiesta
const client = new MongoClient(process.env.MONGODB_URI)

// Il database si chiama "includo". Non va creato a mano:
// MongoDB lo crea da solo al primo inserimento
const db = client.db('includo')

module.exports = { client, db }
