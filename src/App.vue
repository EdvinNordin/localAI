<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Ollama } from 'ollama/browser'
import { marked } from 'marked'

const AImodel = ref('gemma3:4b')
const ollama = new Ollama({ host: 'http://192.168.68.105:5173/ollama' }) //http://localhost:11434
const availableModels = ollama.list()
console.log(availableModels)
const input = ref('')

interface Message {
  text: string
  isUser: boolean
}
const history = ref<Message[]>([])
let context = ''

const container = ref<HTMLElement | null>(null)

async function newResponse() {
  const prompt = input.value
  context = context.concat('The user said: ', input.value)
  input.value = ''
  history.value.push({ text: prompt, isUser: true })
  scrollDown()

  const response = await ollama.chat({
    model: AImodel.value,
    messages: [{ role: 'user', content: context }],
    stream: true,
  })

  history.value.push({ text: '', isUser: false })
  const lastIndex = history.value.length - 1

  for await (const part of response) {
    const word = part.message.content as string

    history.value[lastIndex]!.text += word

    if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
      scrollDown()
  }

  context = context.concat('The llm model then said: ', history.value[lastIndex]!.text)

  history.value[lastIndex]!.text = marked.parse(history.value[lastIndex]!.text) as string
  if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
    scrollDown()
}

async function scrollDown() {
  console.log('scolling down')
  await nextTick()
  if (container.value) {
    container.value.scrollTo({
      top: container.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}
</script>

<template>
  <div class="bg-gradient-to-b from-slate-950 to-slate-500 w-[100vw] h-[100vh]">
    <div v-if="history.length === 0" class="text-center flex flex-col justify-center h-full">
      <h1 class="text-8xl bg-gradient-to-b from-blue-600 to-sky-400 bg-clip-text text-transparent">
        localAI
      </h1>
    </div>
    <div
      ref="container"
      class="text-white mx-auto max-w-7xl flex flex-col items-stretch overflow-y-auto h-screen"
    >
      <div class="mx-2 mb-15">
        <div
          v-for="(response, i) in history"
          :key="i"
          class="flex m-2"
          :class="response.isUser ? 'justify-end' : 'justify-start'"
        >
          <div
            class="inline-block bg-gradient-to-b rounded-md text-xl break-words max-w-200 text-white"
            :class="response.isUser ? 'from-blue-600 to-sky-400' : 'from-violet-600 to-purple-400'"
          >
            <div
              v-html="response.text"
              class="p-3 m-0.5 rounded-md bg-slate-700 backdrop-blur-md"
            ></div>
          </div>
        </div>
      </div>

      <div
        class="flex flex-row fixed bottom-0 max-w-200 w-full left-0 right-0 mx-auto mb-1.5 rounded-md bg-gradient-to-b from-blue-600 to-sky-400"
      >
        <textarea
          v-model="input"
          @keyup.enter.exact="newResponse"
          placeholder="Ask your local AI anyting"
          autofocus
          class="bg-slate-600 rounded-l-md p-2 w-4/5 focus:outline-hidden h-10 m-0.5 mr-0"
        >
        </textarea>

        <input class="w-1/5 bg-slate-500 rounded-r-md p-2 text-center m-0.5 ml-0" />
        <select v-for="(model, i) in availableModels" :key="i" :ref="AImodel">
          <option>{{ model }}</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style>
pre {
  background-color: var(--color-slate-500);
  color: white;
  padding: 10px;
  margin-bottom: 20px;
}
ul {
  margin-bottom: 20px;
  margin-left: 20px;
  list-style: disc;
}
ol {
  margin-bottom: 20px;
  margin-left: 30px;
  list-style: decimal-leading;
}
ol,
li::marker {
  font-weight: bold;
}
p {
  margin-bottom: 10px;
}
li {
  padding-left: 0px;
}
</style>
