<script setup>
import { ref } from 'vue'
import ChatWindow from './components/ChatWindow.vue'

// Primo messaggio mostrato all'apertura. Non arriva dal server:
// serve solo a far capire all'utente che può iniziare a scrivere
const WELCOME_MESSAGE = 'Ciao! Sono l\'assistente di IncluDO. Ti aiuto a scegliere il corso più adatto a te. Raccontami: cosa ti piacerebbe imparare?'

const messages = ref([
  { role: 'assistant', content: WELCOME_MESSAGE }
])

// Diventa true mentre si aspetta la risposta del chatbot.
// Per ora non cambia mai: verrà usato quando collegherò il server
const isWaiting = ref(false)

function addMessage(role, content) {
  messages.value.push({ role: role, content: content })
}

function handleSend(text) {
  addMessage('user', text)
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <h1 class="title">IncluDO</h1>
      <p class="subtitle">Trova il corso di mestiere artigianale adatto a te</p>
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
  padding: 16px;
  text-align: center;
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
