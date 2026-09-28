const { db } = require('./db')
const { createEmbedding } = require('./openai')

// La RAG: riceve una descrizione di cosa cerca l'utente, la trasforma in
// embedding e chiede a MongoDB i corsi con il vettore più vicino.
// remote può essere true, false oppure undefined (l'utente non ha preferenze)
async function searchCourses(query, remote) {
  const queryVector = await createEmbedding(query)

  const vectorSearch = {
    index: 'courses_vector_index',
    path: 'vector',
    queryVector: queryVector,
    // Quanti corsi confrontare prima di scegliere i migliori:
    // il catalogo è piccolo, quindi li guardo tutti
    numCandidates: 50,
    limit: 3
  }

  // Il filtro lo aggiungo solo se l'utente ha espresso una preferenza
  if (remote === true || remote === false) {
    vectorSearch.filter = { 'metadata.remote': remote }
  }

  const results = await db.collection('courses').aggregate([
    { $vectorSearch: vectorSearch },
    {
      // Non mi serve rimandare indietro il vettore (1536 numeri),
      // solo i dati del corso e il punteggio di somiglianza
      $project: {
        _id: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ]).toArray()

  return results
}

module.exports = { searchCourses }
