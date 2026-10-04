const express = require('express')
const crypto = require('crypto')
const { db } = require('../db')
const { openai, CHAT_MODEL } = require('../openai')
const { SYSTEM_PROMPT } = require('../prompt')
const { searchCoursesTool } = require('../tools')
const { searchCourses } = require('../search')

const router = express.Router()

// Messaggi per l'utente quando un servizio esterno non risponde
const AI_ERROR_MESSAGE = 'Il servizio di intelligenza artificiale non è disponibile in questo momento. Riprova tra qualche minuto.'
const DB_ERROR_MESSAGE = 'Non riesco a recuperare la conversazione in questo momento. Riprova tra qualche minuto.'

// POST /api/chat
// Riceve { sessionId, message }: il nuovo messaggio dell'utente e l'id
// della conversazione. Se sessionId manca, la conversazione è nuova.
// La cronologia la tiene il server su MongoDB: il modello non ricorda nulla
// tra una chiamata e l'altra, quindi a ogni richiesta la rileggo dal database
// e la rimando tutta a OpenAI
router.post('/', async (req, res) => {
  const message = req.body.message
  let sessionId = req.body.sessionId

  if (typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Il campo message deve essere un testo non vuoto' })
  }

  const conversations = db.collection('conversations')

  // Recupero i messaggi precedenti, se la conversazione esiste già
  let previousMessages = []
  if (sessionId) {
    let conversation
    try {
      conversation = await conversations.findOne({ _id: sessionId })
    } catch (error) {
      console.log('Errore nella lettura della conversazione: ' + error.message)
      return res.status(503).json({ error: DB_ERROR_MESSAGE })
    }

    if (!conversation) {
      return res.status(404).json({ error: 'Conversazione non trovata' })
    }
    previousMessages = conversation.messages
  } else {
    // Prima richiesta: genero io l'id, così il client non può sceglierlo
    sessionId = crypto.randomUUID()
  }

  // Il system prompt va sempre in testa: è lui che dà al modello
  // il ruolo e le regole. Lo aggiungo io lato server, così il client
  // non può modificarlo
  const fullConversation = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (let i = 0; i < previousMessages.length; i++) {
    fullConversation.push({ role: previousMessages[i].role, content: previousMessages[i].content })
  }
  fullConversation.push({ role: 'user', content: message })

  // Prima chiamata: passo al modello anche il tool. Sarà lui a decidere
  // se rispondere normalmente (per fare un'altra domanda) oppure se
  // chiedere di eseguire searchCourses
  let completion
  try {
    completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: fullConversation,
      tools: [searchCoursesTool]
    })
  } catch (error) {
    // OpenAI non risponde (chiave sbagliata, credito finito, servizio giù):
    // lo dico chiaramente invece di restituire un errore generico
    console.log('Errore nella chiamata a OpenAI: ' + error.message)
    return res.status(503).json({ error: AI_ERROR_MESSAGE })
  }

  const answer = completion.choices[0].message
  let reply

  if (!answer.tool_calls || answer.tool_calls.length === 0) {
    // Caso normale: il modello non ha chiesto il tool, uso il suo testo
    reply = answer.content
  } else {
    // Il modello ha chiesto il tool. Rimetto la sua richiesta nella conversazione,
    // perché la risposta del tool deve seguire la richiesta a cui si riferisce
    fullConversation.push(answer)

    for (let i = 0; i < answer.tool_calls.length; i++) {
      const toolCall = answer.tool_calls[i]

      if (toolCall.function.name === 'searchCourses') {
        console.log('Il modello chiama searchCourses con: ' + toolCall.function.arguments)

        // Il risultato del tool è sempre un testo JSON. Se qualcosa va storto
        // (argomenti non validi, database o OpenAI irraggiungibili) al modello
        // mando un errore esplicito: il prompt gli dice di avvisare l'utente
        // invece di inventare un consiglio
        let toolResult
        try {
          // Gli argomenti arrivano come stringa JSON, scritta dal modello
          const args = JSON.parse(toolCall.function.arguments)
          const results = await searchCourses(args.query, args.remote)

          // Al modello passo solo i dati che gli servono per consigliare
          const courses = []
          for (let j = 0; j < results.length; j++) {
            courses.push({
              id: results[j]._id,
              title: results[j].metadata.title,
              description: results[j].metadata.description,
              duration: results[j].metadata.duration,
              remote: results[j].metadata.remote,
              skills: results[j].metadata.skills
            })
          }
          console.log('Corsi trovati: ' + courses.length)
          toolResult = JSON.stringify(courses)
        } catch (error) {
          console.log('Errore durante searchCourses: ' + error.message)
          toolResult = JSON.stringify({ error: 'La ricerca dei corsi non è riuscita' })
        }

        fullConversation.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult
        })
      }
    }

    // Seconda chiamata: il modello legge i corsi trovati e scrive il consiglio.
    // Qui non passo il tool, così è obbligato a rispondere con un testo
    let finalCompletion
    try {
      finalCompletion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: fullConversation
      })
    } catch (error) {
      console.log('Errore nella chiamata a OpenAI: ' + error.message)
      return res.status(503).json({ error: AI_ERROR_MESSAGE })
    }
    reply = finalCompletion.choices[0].message.content
  }

  // Salvo il messaggio dell'utente e la risposta insieme, solo a risposta
  // ottenuta: se OpenAI fallisce non resta nel database una domanda senza
  // risposta. Salvo solo i messaggi di utente e chatbot, non le chiamate
  // al tool: il consiglio finale contiene già quello che serve ricordare
  const now = new Date()
  try {
    await conversations.updateOne(
      { _id: sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: message, createdAt: now },
              { role: 'assistant', content: reply, createdAt: now }
            ]
          }
        },
        $set: { updatedAt: now },
        $setOnInsert: { createdAt: now }
      },
      // upsert: se la conversazione non esiste ancora, la crea
      { upsert: true }
    )
  } catch (error) {
    console.log('Errore nel salvataggio della conversazione: ' + error.message)
    return res.status(503).json({ error: DB_ERROR_MESSAGE })
  }

  res.json({ sessionId: sessionId, reply: reply })
})

module.exports = router
