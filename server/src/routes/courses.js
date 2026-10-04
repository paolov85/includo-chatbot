const express = require('express')
const { db } = require('../db')
const { createEmbedding } = require('../openai')
const { searchCourses } = require('../search')

const router = express.Router()

// Costruisce la frase che descrive il corso e che verrà trasformata in embedding.
// Metto insieme tutti i campi, così la ricerca tiene conto anche di durata,
// skill e modalità, non solo della descrizione
function courseToText(course) {
  let remoteText = 'no'
  if (course.remote) {
    remoteText = 'sì'
  }

  return course.title + '. ' +
    course.description + ' ' +
    'Durata: ' + course.duration + '. ' +
    'Skill: ' + course.skills.join(', ') + '. ' +
    'Remoto: ' + remoteText + '.'
}

// POST /api/courses/ingest
// Riceve l'array dei corsi (il file data/courses.json), crea l'embedding di
// ognuno e lo salva nel database insieme ai dati del corso
router.post('/ingest', async (req, res) => {
  // È l'unico endpoint che scrive sul catalogo e ogni chiamata consuma
  // credito OpenAI: online lo proteggo con una chiave segreta (ADMIN_KEY),
  // che va mandata nell'header x-admin-key. In locale la variabile
  // non c'è e l'endpoint resta libero
  if (process.env.ADMIN_KEY && req.get('x-admin-key') !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Chiave di amministrazione mancante o non valida' })
  }

  const courses = req.body

  if (!Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'Il corpo deve essere un array di corsi' })
  }

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i]
    if (!course.id || !course.title || !course.description || !course.duration || !Array.isArray(course.skills)) {
      return res.status(400).json({ error: 'Corso in posizione ' + i + ' incompleto' })
    }
  }

  const collection = db.collection('courses')

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i]
    const vector = await createEmbedding(courseToText(course))

    // Uso l'id del corso come _id del documento e faccio un "upsert":
    // se il corso esiste già lo sovrascrivo, altrimenti lo inserisco.
    // Così posso rilanciare l'ingestione senza creare doppioni
    await collection.replaceOne(
      { _id: course.id },
      {
        vector: vector,
        metadata: {
          title: course.title,
          description: course.description,
          duration: course.duration,
          remote: course.remote,
          skills: course.skills
        }
      },
      { upsert: true }
    )
  }

  res.json({ message: 'Corsi salvati', count: courses.length })
})

// GET /api/courses/search?q=...&remote=true
// Serve a provare la ricerca da sola, senza passare dal chatbot
router.get('/search', async (req, res) => {
  const query = req.query.q
  if (!query) {
    return res.status(400).json({ error: 'Manca il parametro q' })
  }

  // Dalla query string arriva sempre una stringa: la converto in booleano
  let remote
  if (req.query.remote === 'true') {
    remote = true
  } else if (req.query.remote === 'false') {
    remote = false
  }

  const results = await searchCourses(query, remote)
  res.json(results)
})

module.exports = router
