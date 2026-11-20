/* eslint-env mocha */

const assert = require('assert')
const { Vec3 } = require('vec3')
const Movements = require('../lib/movements')

// Movements.getBlock judges each block for a walk: safe (the player may stand in it) and physical
// (the player may stand on it). Both must follow the collision box of the block's own state. Every
// state of every block is checked against its box: a safe block leaves the middle of its space free
// up to the head, or is lower than a carpet; a physical one has a box to stand on, no higher than a
// block.

const HALF = 0.3
const EPS = 1e-7

function blocksTheMiddle (shapes) {
  return shapes.some(s => 0.5 + HALF > s[0] + EPS && 0.5 - HALF < s[3] - EPS && 0.5 + HALF > s[2] + EPS && 0.5 - HALF < s[5] - EPS && s[4] > EPS)
}

for (const version of ['1.16.5', '1.20.4', '1.21.4', '26.1']) {
  describe(`Movements.getBlock follows each state's collision box (${version})`, function () {
    const registry = require('minecraft-data')(version)
    const Block = require('prismarine-block')(registry)
    let state = 0
    const bot = {
      registry,
      version,
      blockAt: (pos) => {
        const b = Block.fromStateId(state, 0)
        b.position = pos.floored()
        return b
      }
    }
    const movements = new Movements(bot)
    const at = new Vec3(0, 64, 0)

    it('no state is safe while its box fills the space, nor physical without a box to stand on', function () {
      const wrong = {}
      for (const block of registry.blocksArray) {
        if (movements.blocksToAvoid.has(block.id) || movements.climbables.has(block.id)) continue
        for (let id = block.minStateId; id <= block.maxStateId; id++) {
          state = id
          const b = movements.getBlock(at, 0, 0, 0)
          const top = Math.max(0, ...b.shapes.map(s => s[4]))
          let why = null
          if (b.safe && blocksTheMiddle(b.shapes) && top >= 0.1) why = `safe, with a box up to ${top}`
          else if (b.physical && (b.shapes.length === 0 || top > 1)) why = `physical, with ${b.shapes.length === 0 ? 'no box' : `a box up to ${top}`}`
          if (why) (wrong[block.name] = wrong[block.name] || []).push(`${JSON.stringify(b.getProperties())} ${why}`)
        }
      }
      assert.deepStrictEqual(Object.fromEntries(Object.entries(wrong).map(([k, v]) => [k, `${v.length} states, e.g. ${v[0]}`])), {})
    })
  })
}
