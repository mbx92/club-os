#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function usage() {
  console.log('Usage: node extract-postman-to-md.js --input <postman.json> --output <out.md>')
}

const argv = require('minimist')(process.argv.slice(2))
const inputPath = argv.input || argv.i
const outputPath = argv.output || argv.o

if (!inputPath || !outputPath) {
  usage()
  process.exit(1)
}

const collectionRaw = fs.readFileSync(path.resolve(inputPath), 'utf8')
const collection = JSON.parse(collectionRaw)

const rows = []

function walk(items, parent) {
  items.forEach(item => {
    if (item.request) {
      const method = item.request.method || 'GET'
      let url = ''
      if (item.request.url) {
        if (typeof item.request.url === 'string') url = item.request.url
        else if (item.request.url.raw) url = item.request.url.raw
        else if (Array.isArray(item.request.url.path)) url = item.request.url.path.join('/')
      }

      // Normalize URL
      url = url.replace(/\s+/g, '')

      // Heuristic module detection
      const lower = url.toLowerCase()
      let module = 'unknown'
      if (lower.includes('/restaurant/products')) module = 'Products'
      else if (lower.includes('/restaurant/categories')) module = 'Categories'
      else if (lower.includes('/restaurant/tables')) module = 'Tables'
      else if (lower.includes('/restaurant/locations')) module = 'Locations'
      else if (lower.includes('/restaurant/stock')) module = 'Stock'
      else if (lower.includes('/restaurant/orders')) module = 'Orders'
      else if (lower.includes('/restaurant/queue')) module = 'Queue'
      else if (lower.includes('/restaurant/billing')) module = 'Billing'
      else if (lower.includes('/restaurant/reports')) module = 'Reports'

      // Suggest composable method name
      const methodName = suggestComposableMethod(module, method, url)

      rows.push({ name: item.name || '', method, url, module, methodName, folder: parent || '' })
    }
    if (item.item) walk(item.item, item.name || parent)
  })
}

function suggestComposableMethod(module, httpMethod, url) {
  const base = `useRestaurant${module === 'unknown' ? 'Api' : module}`
  // create a slug for url path
  const slug = url.replace(/[^a-zA-Z0-9_/:-]/g, '').split('/').filter(Boolean).slice(1).join('_')
  const action = httpMethod.toLowerCase()
  // simple mapping
  if (action === 'get') return `${base}.get${toPascalCase(slug || 'List')}`
  if (action === 'post') return `${base}.create${toPascalCase(slug || 'Item')}`
  if (action === 'put' || action === 'patch') return `${base}.update${toPascalCase(slug || 'Item')}`
  if (action === 'delete') return `${base}.delete${toPascalCase(slug || 'Item')}`
  return `${base}.${action}${toPascalCase(slug || '')}`
}

function toPascalCase(text) {
  return text.split(/_|\//).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
}

walk(collection.item || [])

// Build markdown
let md = `# API Endpoint Mapping (auto-generated)\n\n`
md += `Source: ${inputPath}\n\n`
md += `| Method | Endpoint | Module | Suggested Composable Method | Postman Item | Folder |\n`
md += `|---|---|---:|---|---|---|\n`
rows.forEach(r => {
  md += `| ${r.method} | \`${r.url}\` | ${r.module} | \`${r.methodName}\` | ${r.name} | ${r.folder} |\n`
})

fs.writeFileSync(path.resolve(outputPath), md, 'utf8')
console.log('Wrote', rows.length, 'endpoints to', outputPath)
