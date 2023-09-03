export const SEP = Buffer.from([0])
export const MIN = SEP
export const MAX = Buffer.from([255])

export function keyToPath (key, asArray = false) {
  let start = 0
  const arr = []
  for (let i = 0; i < key.length; i++) {
    if (key[i] === 0) {
      arr.push(encodeURIComponent(key.slice(start, i).toString('utf8')))
      start = i + 1
    }
  }
  if (start < key.length) {
    arr.push(encodeURIComponent(key.slice(start).toString('utf8')))
  }
  return asArray ? arr : arr.join('/')
}

export function pathToKey (segments) {
  const arr = new Array((segments.length * 2) - 1)
  for (let i = 0; i < segments.length; i++) {
    arr[i * 2] = Buffer.from(segments[i], 'utf8')
    if (i < segments.length - 1) arr[i * 2 + 1] = SEP
  }
  return Buffer.concat(arr)
}

export async function listShallow (bee, path) {
  if (typeof path === 'string') {
    path = path.split('/').filter(Boolean)
  }

  const arr = []
  const pathlen = path && path.length > 0 ? path.length : 0
  let bot = path && path.length > 0 ? Buffer.concat([pathToKey(path), MIN]) : MIN
  const top = path && path.length > 0 ? Buffer.concat([pathToKey(path), MAX]) : MAX
  do {
    const item = await bee.peek({ gt: bot, lt: top })
    if (!item) return arr

    const itemPath = keyToPath(item.key, true)
    if (itemPath.length > pathlen + 1) {
      const containerPath = itemPath.slice(0, pathlen + 1)
      arr.push({ path: containerPath, isContainer: true })
      bot = Buffer.concat([pathToKey(containerPath), SEP, MAX])
    } else {
      arr.push({ path: itemPath, isContainer: false, value: item.value })
      bot = pathToKey(itemPath)
    }
  } while (true)
}
