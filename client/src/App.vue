<script setup>
import { ref, onMounted } from 'vue'
import ChatWindow from './components/ChatWindow.vue'

// Indirizzo del back end: online lo prendo dalla variabile d'ambiente,
// in locale uso il server avviato sulla porta 3000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Chiave con cui salvo l'id della conversazione nel browser
const SESSION_KEY = 'includo-session-id'

// Primo messaggio mostrato all'apertura. Non arriva dal server:
// serve solo a far capire all'utente che può iniziare a scrivere
const WELCOME_MESSAGE = 'Ciao! Sono l\'assistente di IncluDO. Ti aiuto a scegliere il corso più adatto a te. Raccontami: cosa ti piacerebbe imparare?'

const GENERIC_ERROR = 'Non riesco a contattare il server. Controlla la connessione e riprova.'

const messages = ref([])

// Diventa true mentre si aspetta la risposta del chatbot
const isWaiting = ref(false)

// Id della conversazione: lo genera il server alla prima risposta.
// Lo salvo in localStorage così, se l'utente ricarica la pagina,
// posso chiedere al server la stessa conversazione
let sessionId = localStorage.getItem(SESSION_KEY)

function addMessage(role, content) {
  messages.value.push({ role: role, content: content })
}

function showWelcome() {
  messages.value = []
  addMessage('assistant', WELCOME_MESSAGE)
}

// All'apertura della pagina: se c'è una conversazione salvata la ripristino,
// altrimenti parto dal messaggio di benvenuto
async function restoreConversation() {
  showWelcome()

  if (!sessionId) {
    return
  }

  try {
    const response = await fetch(API_URL + '/api/conversations/' + sessionId)

    if (response.status === 404) {
      // La conversazione sul server non c'è più: ne inizio una nuova
      startNewConversation()
      return
    }
    if (!response.ok) {
      throw new Error('Risposta non valida')
    }

    const data = await response.json()
    for (let i = 0; i < data.messages.length; i++) {
      addMessage(data.messages[i].role, data.messages[i].content)
    }
  } catch (error) {
    addMessage('error', 'Non è stato possibile recuperare la conversazione precedente.')
  }
}

onMounted(restoreConversation)

async function handleSend(text) {
  addMessage('user', text)
  isWaiting.value = true

  // Alla prima richiesta sessionId è null e non lo mando:
  // sarà il server a crearne uno nuovo
  const body = { message: text }
  if (sessionId) {
    body.sessionId = sessionId
  }

  try {
    const response = await fetch(API_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await response.json()

    if (!response.ok) {
      // Il server risponde con un messaggio d'errore già pensato per l'utente
      addMessage('error', data.error)
      return
    }

    sessionId = data.sessionId
    localStorage.setItem(SESSION_KEY, sessionId)
    addMessage('assistant', data.reply)
  } catch (error) {
    // Il server non risponde proprio (spento, rete assente)
    addMessage('error', GENERIC_ERROR)
  } finally {
    isWaiting.value = false
  }
}

function startNewConversation() {
  sessionId = null
  localStorage.removeItem(SESSION_KEY)
  showWelcome()
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1 class="title">IncluDO</h1>
        <p class="subtitle">Trova il corso di mestiere artigianale adatto a te</p>
      </div>

      <button class="new-button" type="button" :disabled="isWaiting" @click="startNewConversation">
        Nuova conversazione
      </button>
    </header>

    <main class="chat">
      <ChatWindow :messages="messages" :is-waiting="isWaiting" @send="handleSend" />
    </main>
  </div>
</template>

<style scoped>
.page {
  max-width: 760px;
  height: 100vh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.title {
  margin: 0;
  font-size: 26px;
  color: #0f766e;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 15px;
  color: #78716c;
}

.new-button {
  flex-shrink: 0;
  padding: 8px 14px;
  font-size: 14px;
  font-family: inherit;
  color: #0f766e;
  background-color: #ffffff;
  border: 1px solid #0d9488;
  border-radius: 20px;
  cursor: pointer;
}

.new-button:hover {
  background-color: #f0fdfa;
}

.new-button:disabled {
  color: #a8a29e;
  border-color: #d6d3d1;
  cursor: default;
}

.chat {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 0 16px 16px;
  background-color: #fafaf9;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  overflow: hidden;
}
</style>
