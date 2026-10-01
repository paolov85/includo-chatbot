const express = require('express')
const { openai, CHAT_MODEL } = require('../openai')
const { SYSTEM_PROMPT } = require('../prompt')
const { searchCoursesTool } = require('../tools')
const { searchCourses } = require('../search')

const router = express.Router()

// Messaggio per l'utente quando OpenAI non risponde
const AI_ERROR_MESSAGE = 'Il servizio di intelligenza artificiale non è disponibile in questo momento. Riprova tra qualche minuto.'

// POST /api/chat
// Riceve la conversazione fino a qui: { messages: [{ role, content }, ...] }
// e risponde con il messaggio successivo del chatbot.
// Per ora è il client a mandare tutta la cronologia a ogni richiesta,
// perché il modello non ricorda nulla tra una chiamata e l'altra
router.post('/', async (req, res) => {
  const messages = req.body.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Il campo messages deve essere un array non vuoto' })
  }

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    if (message.role !== 'user' && message.role !== 'assistant') {
      return res.status(400).json({ error: 'Ruolo non valido nel messaggio ' + i })
    }
    if (typeof message.content !== 'string' || message.content.trim() === '') {
      return res.status(400).json({ error: 'Contenuto mancante nel messaggio ' + i })
    }
  }

  // Il system prompt va sempre in testa: è lui che dà al modello
  // il ruolo e le regole. Lo aggiungo io lato server, così il client
  // non può modificarlo
  const fullConversation = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (let i = 0; i < messages.length; i++) {
    fullConversation.push({ role: messages[i].role, content: messages[i].content })
  }

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
  } catch (errore) {
    // OpenAI non risponde (chiave sbagliata, credito finito, servizio giù):
    // lo dico chiaramente invece di restituire un errore generico
    console.log('Errore nella chiamata a OpenAI: ' + errore.message)
    return res.status(503).json({ error: AI_ERROR_MESSAGE })
  }

  const answer = completion.choices[0].message

  // Caso normale: il modello non ha chiesto il tool, rispondo con il suo testo
  if (!answer.tool_calls || answer.tool_calls.length === 0) {
    return res.json({ reply: answer.content })
  }

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
      } catch (errore) {
        console.log('Errore durante searchCourses: ' + errore.message)
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
  } catch (errore) {
    console.log('Errore nella chiamata a OpenAI: ' + errore.message)
    return res.status(503).json({ error: AI_ERROR_MESSAGE })
  }

  res.json({ reply: finalCompletion.choices[0].message.content })
})

module.exports = router
