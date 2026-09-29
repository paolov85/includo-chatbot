const express = require('express')
const { openai, CHAT_MODEL } = require('../openai')
const { SYSTEM_PROMPT } = require('../prompt')
const { searchCoursesTool } = require('../tools')
const { searchCourses } = require('../search')

const router = express.Router()

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
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: fullConversation,
    tools: [searchCoursesTool]
  })

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
      // Gli argomenti arrivano come stringa JSON
      const args = JSON.parse(toolCall.function.arguments)
      console.log('Il modello chiama searchCourses con: ' + toolCall.function.arguments)

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

      fullConversation.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(courses)
      })
    }
  }

  // Seconda chiamata: il modello legge i corsi trovati e scrive il consiglio.
  // Qui non passo il tool, così è obbligato a rispondere con un testo
  const finalCompletion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: fullConversation
  })

  res.json({ reply: finalCompletion.choices[0].message.content })
})

module.exports = router
