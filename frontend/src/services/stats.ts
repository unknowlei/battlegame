const _a = [117,100,66,104,115,120,70,80,80,67,79,97,98,120,67,115,76,54,107,116,109,87,121,66,45,103,122,71,122,111,72,115,122]
const _k = [119,48,55,82,73,57,111,72,87,101,106,67,114,77,76,106,86,109,120,110,48,76,107,116]
const _s = [104,116,116,112,115,58,47,47,117,100,98,104,115,120,102,112,46,108,99,45,99,110,45,110,49,45,115,104,97,114,101,100,46,99,111,109]
const _x = (a: number[]) => a.map(c => String.fromCharCode(c)).join('')

interface StatsResult {
  count: number
}

function _c() {
  return { a: _x(_a), k: _x(_k), s: _x(_s) }
}

function _did(): string {
  const k = 'pb_did'
  let d = localStorage.getItem(k)
  if (!d) {
    d = crypto.randomUUID()
    localStorage.setItem(k, d)
  }
  return d
}

export async function recordBattle(defender: string, challenger: string): Promise<void> {
  const c = _c()
  const deviceId = _did()

  try {
    await fetch(`${c.s}/1.1/classes/game1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LC-Id': c.a,
        'X-LC-Key': c.k
      },
      body: JSON.stringify({
        defender,
        challenger,
        deviceId,
        timestamp: Date.now()
      })
    })
  } catch {
    // silent
  }
}

export async function getUniqueCount(defender: string, challenger: string): Promise<number> {
  const c = _c()

  try {
    const where = encodeURIComponent(JSON.stringify({ defender, challenger }))
    const response = await fetch(
      `${c.s}/1.1/classes/game1?where=${where}&keys=deviceId&limit=1000`,
      {
        method: 'GET',
        headers: { 'X-LC-Id': c.a, 'X-LC-Key': c.k }
      }
    )

    if (!response.ok) return 0

    const data = await response.json()
    const uniqueDevices = new Set(data.results?.map((r: any) => r.deviceId) || [])
    return uniqueDevices.size
  } catch {
    return 0
  }
}