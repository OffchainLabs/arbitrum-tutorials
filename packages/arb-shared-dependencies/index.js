const hardhatConfig = require('./hardhat.config.js')
const path = require('path')
const fs = require('fs')
const { registerCustomArbitrumNetwork } = require('@arbitrum/sdk')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const wait = (ms = 0) => {
  return new Promise(res => setTimeout(res, ms || 0))
}

const arbLog = async text => {
  let str = '🔵'
  for (let i = 0; i < 25; i++) {
    await wait(40)
    if (i == 12) {
      str = `🔵${'🔵'.repeat(i)}🔵`
    } else {
      str = `🔵${' '.repeat(i * 2)}🔵`
    }
    while (str.length < 60) {
      str = ` ${str} `
    }

    console.log(str)
  }

  console.log('Arbitrum Demo:', text)
  await wait(2000)

  console.log('Lets')
  await wait(1000)

  console.log('Go ➡️')
  await wait(1000)
  console.log('...🚀')
  await wait(1000)
  console.log('')
}

const arbLogTitle = text => {
  console.log('\n###################')
  console.log(text)
  console.log('###################')
}

const requireEnvVariables = envVars => {
  for (const envVar of envVars) {
    if (!process.env[envVar]) {
      throw new Error(`Error: set your '${envVar}' environmental variable `)
    }
  }
  console.log('Environmental variables properly set 👍')
}

const addNetworkFromFile = () => {
  const pathToLocalNetworkFile = path.join(
    __dirname,
    '..',
    '..',
    'localNetwork.json'
  )
  if (!fs.existsSync(pathToLocalNetworkFile)) {
    return
  }

  const localNetworksFile = fs.readFileSync(pathToLocalNetworkFile, 'utf8')
  const localL2 = JSON.parse(localNetworksFile).l2Network
  const localL3 = JSON.parse(localNetworksFile).l3Network

  const childChain = localL3 ? localL3 : localL2
  registerCustomArbitrumNetwork(childChain)
}

module.exports = {
  arbLog,
  arbLogTitle,
  hardhatConfig,
  requireEnvVariables,
  addNetworkFromFile,
}
