import swaggerAutogen from 'swagger-autogen'

const doc = {
    info: {
        title: 'Agentic Supply Chain Guardian API',
        description: 'AI-powered supply chain monitoring backend'
    },
    host: 'localhost:8000'
}

const outputFile = './docs/swagger-output.json'
const routes = ['./server.js']

swaggerAutogen()(outputFile, routes, doc)