<script setup lang="ts">
import { ref, nextTick } from 'vue'
//import axios from 'axios'
import { Ollama } from 'ollama'
import { marked } from 'marked'

const ollama = new Ollama({ host: 'http://192.168.68.105:11434' })
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
  <div class="bg-gray-700 text-white mx-auto max-w-250">
    <div class="mx-2 mb-15">
      <div
        v-for="(response, i) in responseHistory"
        :key="i"
        class="flex m-2"
        :class="response.isUser ? 'justify-end' : 'justify-start'"
      >
        <div
          class="inline-block p-3 rounded-xl text-xl break-words max-w-150"
          :class="response.isUser ? 'bg-violet-400 text-white' : 'bg-gray-300 text-black'"
          v-html="response.text"
        ></div>
      </div>
    </div>
    <div
      class="fixed bottom-0 bg-gray-700 max-w-200 w-full left-0 right-0 mx-auto mb-1.5 rounded-md"
    >
      <input
        v-model="input"
        @keyup.enter="newResponse"
        placeholder="Ask anything"
        class="rounded-md p-2 border-2 w-full focus:outline-hidden"
      />
    </div>
  </div>
</template>

<style scoped></style>
