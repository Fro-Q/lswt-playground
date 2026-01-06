#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process'
import process from 'node:process'
import readline from 'node:readline'

const channels = [
  'auto',
  'patch',
  'minor',
  'major',
  'alpha',
  'beta',
  'rc',
  'premajor',
  'preminor',
  'prepatch',
  'canary',
] as const

type Channel = (typeof channels)[number]

// 从 process.argv 里读子命令
const channel = (process.argv[2] as Channel) || 'auto'

if (!channels.includes(channel)) {
  console.error(`Unknown release channel: ${channel}`)
  console.error(`Usage: pnpm release [${channels.join(' | ')}]`)
  process.exit(1)
}

function run(cmd: string, opts: { stdio?: 'inherit' | 'pipe' } = { stdio: 'inherit' }) {
  execSync(cmd, { stdio: opts.stdio ?? 'inherit' })
}

async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  // 1. 确保工作区干净
  const status = execSync('git status --porcelain').toString().trim()
  if (status) {
    console.error('Working tree is not clean. Please commit or stash changes first.')
    process.exit(1)
  }

  // 2. 跑测试（根据你的项目改命令）
  // console.log('> Running tests...')
  // try {
  //   run('pnpm test')
  // }
  // catch {
  //   console.error('Tests failed. Aborting release.')
  //   process.exit(1)
  // }

  // 3. 预览 changelog（不写文件）
  console.log('> Previewing changelog...\n')
  // 用 spawn 避免 execSync 输出被截断
  await new Promise<void>((resolve, reject) => {
    const p = spawn('pnpm', ['changelog:preview'], { stdio: 'inherit' })
    p.on('close', (code) => {
      if (code === 0)
        resolve()
      else reject(new Error(`changelog:preview exited with code ${code}`))
    })
  })

  // 4. 交互确认
  const answer = (await ask(`\nAbout to run a "${channel}" release. Continue? [y/N] `)).trim()
  if (!/^y(?:es)?$/i.test(answer.trim())) {
    console.log('Aborted.')
    process.exit(0)
  }

  // 5. 组装 changelogen 参数
  const args: string[] = ['--release']

  switch (channel) {
    case 'patch':
      args.push('--patch')
      break
    case 'minor':
      args.push('--minor')
      break
    case 'major':
      args.push('--major')
      break
    case 'premajor':
      args.push('--premajor')
      break
    case 'preminor':
      args.push('--preminor')
      break
    case 'prepatch':
      args.push('--prepatch')
      break
    case 'alpha':
      args.push('--prerelease', 'alpha')
      break
    case 'beta':
      args.push('--prerelease', 'beta')
      break
    case 'rc':
      args.push('--prerelease', 'rc')
      break
    case 'canary':
      args.push('--canary')
      break
    case 'auto':
    default:
      // 交给 changelogen 自动推断
      break
  }

  // 6. 真正执行 changelogen
  console.log('\n> Running changelogen', args.join(' '))

  await new Promise<void>((resolve, reject) => {
    const p = spawn('changelogen', args, { stdio: 'inherit' })
    p.on('close', (code) => {
      if (code === 0)
        resolve()
      else reject(new Error(`changelogen exited with code ${code}`))
    })
  })

  console.log('\nRelease done. Don’t forget to:')
  console.log('  git push && git push --tags')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
