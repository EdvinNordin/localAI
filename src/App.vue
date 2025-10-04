<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Ollama } from 'ollama'
import { marked } from 'marked'

const ollama = new Ollama({ host: 'http://192.168.68.105:11434' }) //http://localhost:11434
const input = ref('')

interface Message {
  text: string | Promise<string>
  isUser: boolean
}
const responseHistory = ref<Message[]>([])

async function newResponse() {
  const prompt = input.value
  input.value = ''
  responseHistory.value.push({ text: prompt, isUser: true })
  scrollDown()

  const AIresponse = (
    await ollama.chat({
      model: 'gemma3:4b',
      messages: [{ role: 'user', content: prompt }],
    })
  ).message.content

  responseHistory.value.push({ text: marked.parse(AIresponse), isUser: false })
  scrollDown()
}

async function scrollDown() {
  await nextTick()
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth',
  })
}
</script>

<template>
  <div class="text-white mx-auto max-w-250">
    <div class="mx-2 mb-15">
      <div
        v-for="(response, i) in responseHistory"
        :key="i"
        class="flex m-2"
        :class="response.isUser ? 'justify-end' : 'justify-start'"
      >
        <div
          class="inline-block p-3 rounded-sm text-xl break-words max-w-150"
          :class="response.isUser ? 'bg-violet-300 text-black' : 'bg-violet-100 text-black'"
          v-html="response.text"
        ></div>
      </div>
    </div>
    <div
      class="fixed bottom-0 max-w-200 w-full left-0 right-0 mx-auto mb-1.5 rounded-md bg-slate-600"
    >
      <textarea
        v-model="input"
        @keyup.shift.enter="newResponse"
        placeholder="Press shift + enter to send your message"
        class="rounded-sm p-2 border-2 w-full focus:outline-hidden h-11"
      ></textarea>
    </div>
  </div>
</template>

<style scoped></style>
