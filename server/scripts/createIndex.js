// Script da lanciare una sola volta (npm run create-index) per creare su Atlas
// l'indice vettoriale della collection "courses".
// Senza questo indice MongoDB non sa fare la ricerca per similarità ($vectorSearch)
require('dotenv').config()

const { client, db } = require('../src/db')

async function createIndex() {
  const collection = db.collection('courses')

  await collection.createSearchIndex({
    name: 'courses_vector_index',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          // Il campo che contiene l'embedding del corso
          type: 'vector',
          path: 'vector',
          // Deve coincidere con la lunghezza dei vettori di text-embedding-3-small
          numDimensions: 1536,
          // Due vettori sono "vicini" se puntano nella stessa direzione
          similarity: 'cosine'
        },
        {
          // Campo su cui voglio poter filtrare: corsi da remoto sì o no
          type: 'filter',
          path: 'metadata.remote'
        }
      ]
    }
  })

  console.log('Indice creato. Atlas impiega circa un minuto a renderlo utilizzabile.')
}

createIndex()
  .catch((error) => {
    console.log('Errore nella creazione dell\'indice: ' + error.message)
  })
  .finally(() => {
    client.close()
  })
