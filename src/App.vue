<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Ollama } from 'ollama/browser'
import { marked } from 'marked'

const currentDate = new Date().toDateString()

//URL SETTING
const host = window.location.origin + '/ollama'

//OLLAMA SETTINGS
const ollama = new Ollama({ host: host }) //url + 'ollama'
const AImodel = ref()
const availableModels = ref<string[]>([])
ollama.list().then((result) => {
  availableModels.value = result.models.map((m: { name: string }) => m.name)
  AImodel.value = availableModels.value[0]
})

//REFs
const input = ref('')
const fullAIcontext = <{ role: string; content: string }[]>[]
const shownConversation = ref<{ role: string; content: string }[]>([])
const container = ref<HTMLElement | null>(null)
const RAG = ref(true)
fullAIcontext.push({
  role: 'system',
  content: `
  You are a knowledgeable and helpful AI assistant.
  Today's date is ${currentDate}.

  You may receive additional web search context, including short summaries of recent web pages and a numeric relevance score.
  Use this information only when it is clearly relevant and more up-to-date than your own knowledge.

  Guidelines:
  - Prioritize factual accuracy.
  - When web context is provided, integrate it naturally into your answer.
  - Do NOT mention the relevance scores or that a web search was used.
  - If the web info seems unrelated or low relevance, ignore it.
  - Always provide clear, confident, and concise answers in natural language.
  - If you find information in the web summaries that updates or contradicts older facts, prefer the newer information.
  `,
})
let isRunning = false

//LLM RESPONSE GENERATION
async function newResponse() {
  isRunning = true
  const prompt = input.value
  input.value = ''

  shownConversation.value.push({ role: 'user', content: prompt })

  let context = ''
  if (RAG.value) {
    const topTexts = await webSearch(prompt)
    if (topTexts !== '') {
      context = `
      \n\n[BEGIN WEB CONTEXT]
      The following summaries were retrieved from recent web results:
      ${topTexts}
      [END WEB CONTEXT]
      `
    }
  }
  fullAIcontext.push({ role: 'user', content: prompt + context })

  scrollDown()

  const response = await ollama.chat({
    model: AImodel.value,
    messages: fullAIcontext,
    stream: true,
  })

  //create a new history element
  shownConversation.value.push({ role: 'assistant', content: '' })
  const lastIndex = shownConversation.value.length - 1

  //stream the assitants message into the new history element
  for await (const part of response) {
    const word = part.message.content as string

    shownConversation.value[lastIndex]!.content += word

    if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
      scrollDown()
  }

  fullAIcontext.push({ role: 'assistant', content: shownConversation.value[lastIndex]!.content })
  //From text to html to show on screen
  shownConversation.value[lastIndex]!.content = marked.parse(
    shownConversation.value[lastIndex]!.content,
  ) as string
  if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
    scrollDown()

  isRunning = false
}

// WEBSEARCH FUNCTION
async function webSearch(prompt: string) {
  //Create a google query
  const webSearch = await ollama.generate({
    model: AImodel.value,
    prompt: `
          You are a skilled search assistant.
          Rewrite the following user message as a concise Google search query.
          Keep it short, use natural search phrasing, and include relevant keywords.
          Only return the search query text itself — no explanations or formatting.

          User message: "${prompt}"
          Current date: ${currentDate}
          `,
  })

  //Pull the results from the web
  const webResults = await fetch('/langsearch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: webSearch.response }),
  }).then((r) => r.json())

  const resultString = JSON.stringify(webResults)

  return resultString
}

/* function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i]!, 0)
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0))
  return dot / (magA * magB)
} */

async function scrollDown() {
  await nextTick()
  if (container.value) {
    container.value.scrollTo({
      top: container.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}

function stopAllStreams() {
  ollama.abort()
}
</script>

<template>
  <div class="bg-gradient-to-b from-slate-950 to-slate-500 w-[100vw] h-[100vh]">
    <h1
      v-if="shownConversation.length === 0"
      class="fixed left-[50%] top-[40%] -translate-[50%] text-8xl bg-gradient-to-b from-blue-600 to-sky-400 bg-clip-text text-transparent"
    >
      localLLM
    </h1>
    <div
      ref="container"
      class="text-white mx-auto max-w-7xl flex flex-col items-stretch overflow-y-auto h-screen"
    >
      <div class="mx-2 mb-15">
        <div
          v-for="(response, i) in shownConversation"
          :key="i"
          :class="response.role === 'user' ? 'justify-end' : 'justify-start'"
          class="flex m-2"
        >
          <div
            v-if="response.role !== 'system'"
            class="inline-block bg-gradient-to-b rounded-md text-xl break-words max-w-200 text-white"
            :class="
              response.role === 'user'
                ? 'from-blue-600 to-sky-400 justify-end'
                : 'from-violet-600 to-purple-400 justify-start'
            "
          >
            <div
              v-html="response.content"
              class="p-3 m-0.5 rounded-md bg-slate-700 backdrop-blur-md"
            ></div>
          </div>
        </div>
      </div>

      <div class="w-full max-w-200 fixed bottom-1 mx-auto left-0 right-0">
        <div class="fixed bottom-13 text-xs ml-1 flex flex-row text-center">
          <h1>Use Web Search</h1>
          <input type="checkbox" v-model="RAG" class="ml-2" />
        </div>
        <div class="rounded-md bg-gradient-to-b from-blue-600 to-sky-400 p-0.5">
          <div class="flex flex-row align-middle bg-slate-600 rounded-md">
            <textarea
              v-model="input"
              @keyup.enter.exact="newResponse"
              placeholder="Ask your local AI anything"
              autofocus
              class="rounded-l-md p-2 w-full focus:outline-hidden h-10 mr-0 resize-none"
            >
            </textarea>
            <div
              class=" rounded-full  h-8 w-11 flex items-center justify-center my-auto mr-1"
            >
              <span v-if="isRunning"
              @click="stopAllStreams"
              class="text-white cursor-pointer text-2xl font-[Segoe_UI_Symbol] leading-none select-none">
                &#x23F9;
              </span>
            </div>
            <div class="w-/5 bg-slate-800 rounded-r-md p-2 pl-3.5 text-center ml-0 flex flex-row">
              <select v-model="AImodel" required>
                <option v-for="(model, i) in availableModels" :key="i" class="bg-slate-800 text-white">{{ model }}</option>
              </select>
            </div>
          </div>
        </div>
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
