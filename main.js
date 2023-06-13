function Decompose (syllable) {
  const firstSyllable = 0xAC00
  const lastSyllable = 0xD7A3
  const firstLeading = 0x1100
  const firstVowel = 0x1161
  const firstTrailingConsonant = 0x11A8
  const perLeading = 588
  const perVowel = 28
  let cp = syllable.codePointAt(0)
  if (cp > lastSyllable || cp < firstSyllable) {
    return syllable
  }
  cp -= firstSyllable
  const a = Math.floor(cp / perLeading)
  cp %= perLeading
  const b = Math.floor(cp / perVowel)
  cp %= perVowel
  const res = [String.fromCodePoint(a + firstLeading), String.fromCodePoint(b + firstVowel)]
  if (cp !== 0) {
    res.push(String.fromCodePoint(cp + firstTrailingConsonant - 1))
  }
  return res.join('')
}

function * HyphenIterator (string) {
  let offset = 0
  let index = 0
  while ((index = string.indexOf('-', offset)) > -1) {
    yield string.substring(offset, index)
    offset = index + 1
  }
  yield string.substring(offset)
}

function * WordIterator (string) {
  let offset = 0
  let index = 0
  while ((index = string.indexOf(' ', offset)) > -1) {
    if (index - offset > 0) {
      yield string.substring(offset, index)
    }
    offset = index + 1
  }
  if (offset < string.length) {
    yield string.substring(offset)
  }
}

const HangulSyllableRegex = /^[\uAC00-\uD7A3]$/
function IsHangulSyllable (string) {
  return HangulSyllableRegex.test(string)
}

function TransformMid (pieces) {
  return `[${pieces.join(', ')}]`
}

function TransformHangul (string) {
  const parts = []
  const empty = []
  let previous = empty
  for (let i = 0; i < string.length; ++i) {
    const ch = string[i]
    if (!IsHangulSyllable(ch)) {
      previous = empty
      parts.push(ch)
    } else {
      const decomp = Decompose(ch)
      const pieces = [previous, ch, empty]
      previous = decomp
      if (i + 1 < string.length && IsHangulSyllable(string[i + 1])) {
        pieces[2] = Decompose(string[i + 1])
      }
      parts.push(TransformMid(pieces))
    }
  }
  return parts.join(' ')
}

const BlockMap = new Map()
const RomanMap = new Map()
const JamoTable = {
  ᄀ: 'g',
  ᄁ: { text: 'kk', double: 'ᄁ' },
  ᄂ: 'n',
  ᄃ: 'd',
  ᄄ: { text: 'tt', double: 'ᄃ' },
  ᄅ: 'l',
  ᄆ: 'm',
  ᄇ: 'b',
  ᄈ: { text: 'pp', double: 'ᄇ' },
  ᄉ: 's',
  ᄊ: { text: 'ss', double: 'ᄉ' },
  ᄋ: '',
  ᄌ: 'j',
  ᄍ: { text: 'jj', double: 'ᄌ' },
  ᄎ: 'ch',
  ᄏ: 'k',
  ᄐ: 't',
  ᄑ: 'p',
  ᄒ: 'h',

  ᅡ: 'a',
  ᅢ: 'ae',
  ᅣ: 'ya',
  ᅤ: 'yae',
  ᅥ: 'eo',
  ᅦ: 'e',
  ᅧ: 'yeo',
  ᅨ: 'ye',
  ᅩ: 'o',
  ᅪ: 'wa',
  ᅫ: 'wae',
  ᅬ: 'oe',
  ᅭ: 'yo',
  ᅮ: 'u',
  ᅯ: 'wo',
  ᅰ: 'we',
  ᅱ: 'wi',
  ᅲ: 'yu',
  ᅳ: 'eu',
  ᅴ: 'ui',
  ᅵ: 'i',

  ᆨ: 'g',
  ᆩ: { text: 'gg', first: 'ᆨ', second: 'ᆨ' },
  ᆪ: { text: 'gs', first: 'ᆨ', second: 'ᆺ' },
  ᆫ: 'n',
  ᆬ: { text: 'nj', first: 'ᆫ', second: 'ᆽ' },
  ᆭ: { text: 'nh', first: 'ᆫ', second: 'ᇂ' },
  ᆮ: 'd',
  ᆯ: 'l',
  ᆰ: { text: 'lg', first: 'ᆯ', second: 'ᆨ' },
  ᆱ: { text: 'lm', first: 'ᆯ', second: 'ᆷ' },
  ᆲ: { text: 'lb', first: 'ᆯ', second: 'ᆸ' },
  ᆳ: { text: 'ls', first: 'ᆯ', second: 'ᆺ' },
  ᆴ: { text: 'lt', first: 'ᆯ', second: 'ᇀ' },
  ᆵ: { text: 'lp', first: 'ᆯ', second: 'ᇁ' },
  ᆶ: { text: 'lh', first: 'ᆯ', second: 'ᇂ' },
  ᆷ: 'm',
  ᆸ: 'b',
  ᆹ: { text: 'bs', first: 'ᆸ', second: 'ᆺ' },
  ᆺ: 's',
  ᆻ: { text: 'ss', first: 'ᆺ', second: 'ᆺ' },
  ᆼ: { text: 'ng', split: true },
  ᆽ: 'j',
  ᆾ: 'ch',
  ᆿ: 'k',
  ᇀ: 't',
  ᇁ: 'p',
  ᇂ: 'h'
}
const InverseVowelJamo = {}
const InverseLeadJamo = {}
const InverseTailJamo = {}

const ConfusionMap = new Map()
function IsConfusing (a, b) {
  if (ConfusionMap.has(a.at(-1))) {
    return ConfusionMap.get(a.at(-1)).has(b.at(0))
  }
  return false
}

function TransformHangulUnique (string) {
  const parts = []
  for (let i = 0, last; i < string.length; ++i) {
    const ch = string[i]
    if (IsHangulSyllable(ch)) {
      const current = ch.normalize('NFD')
      if (last && IsConfusing(last, current) && current[0] !== 'ᄋ') {
        parts.push('-')
      }
      for (const jamo of current) {
        if (!(jamo in JamoTable)) {
          throw new Error(jamo)
        }
        parts.push(JamoTable[jamo].text)
      }
      if (parts.length === current.length && current[0] === 'ᄋ') {
        parts[0] = ''
      }
      last = current
    } else {
      parts.push(ch)
      last = undefined
    }
  }
  return parts.join('')
}

function TransformUniqueRoman (string, allowPartial = false) {
  const blocks = []
  for (let roman of HyphenIterator(string)) {
    roman = roman.toLowerCase()
    if (RomanMap.has(roman)) {
      blocks.push(RomanMap.get(roman))
    } else {
      if (!allowPartial && roman.length > 0) {
        return string
      }
      if (roman.length === 0) {
        blocks.push('-')
      } else {
        blocks.push(roman)
      }
    }
  }
  if (blocks.length === 0) {
    return string
  }
  return blocks.join('')
}

const TransformRoughRomanVowelRegex = /[aeiouyw]/
const TransformRoughRomanConsonantRegex = /[^aeiouyw]/
function TransformRoughRoman (string) {
  const history = []
  let index = 0
  let state = 'initial'
  let trailing = false
  let maxTail = 2
  let maxVowel = 3
  let skipVowel = false
  let offset = 0
  const parts = []
  let pending
  const convertVowel = vowel => InverseVowelJamo[vowel]
  const convertFirst = consonant => InverseLeadJamo[consonant]
  const convertLast = consonant => InverseTailJamo[consonant]
  const backup = (maxTail = 2, maxVowel = 3) => {
    history.push({
      state,
      index,
      length: parts.length,
      trailing,
      maxTail,
      maxVowel,
      skipVowel
    })
  }
  const rewind = () => {
    if (history.length === 0) {
      state = 'error'
      return
    }
    const recovery = history.pop()
    state = recovery.state
    index = recovery.index
    parts.length = recovery.length
    trailing = recovery.trailing
    maxTail = recovery.maxTail
    maxVowel = recovery.maxVowel
    skipVowel = recovery.skipVowel
    offset = 0
  }
  const read = (regex, n = 3) => {
    let k = index + offset
    while (k - index - offset < n && k < string.length && regex.test(string[k])) {
      k += 1
    }
    return string.substring(index + offset, k)
  }
  const readVowel = () => {
    const vowel = read(TransformRoughRomanVowelRegex, maxVowel)
    if (vowel in InverseVowelJamo) {
      offset += vowel.length
      return vowel
    }
    if (vowel.length > 2 && vowel.substring(0, 2) in InverseVowelJamo) {
      offset += 2
      return vowel.substring(0, 2)
    }
    if (vowel[0] in InverseVowelJamo) {
      offset += 1
      return vowel.substring(0, 1)
    }
    return null
  }
  const readConsonant = (table, n = 2) => {
    const consonant = read(TransformRoughRomanConsonantRegex, n)
    if (consonant in table) {
      offset += consonant.length
      return consonant
    }
    if (consonant[0] in table) {
      offset += 1
      return consonant[0]
    }
    return null
  }
  const readFirstConsonant = () => {
    return readConsonant(InverseLeadJamo)
  }
  const readLastConsonant = () => {
    const res = readConsonant(InverseTailJamo, maxTail)
    maxTail = 2
    return res
  }
  const ReadVowel = () => {
    const vowel = readVowel()
    if (vowel == null || vowel.length === 0) {
      return false
    }
    pending.push(convertVowel(vowel))
    return true
  }
  const ReadHead = () => {
    const consonant = readFirstConsonant()
    if (consonant == null || consonant.length === 0) {
      return false
    }
    pending.push(convertFirst(consonant))
    return true
  }
  const ReadTail = () => {
    const consonant = readLastConsonant()
    if (consonant == null) {
      return false
    }
    pending.push(convertLast(consonant))
    return true
  }
  let N = 10 + string.length * 4
  while (state !== 'final' && N-- > 0) {
    pending = []
    index += offset
    offset = 0
    if (index >= string.length) {
      break
    }
    switch (state) {
      case 'initial': {
        if (ReadVowel()) {
          if (JamoTable[pending[0]].text.length > 1) {
            const length = JamoTable[pending[0]].text.length
            for (let i = 1; i < length; ++i) {
              // backup(3, length - i)
            }
          }
          parts.push('ᄋ')
          parts.push(pending[0])
          if (ReadTail()) {
            const stack = [parts.pop(), parts.pop()].reverse()
            const ref = JamoTable[pending[1]]
            if (ref.split || ref.second) {
              backup(1)
            }
            backup(0)
            parts.push(...stack, pending[1])
          }
        }
        state = 'hangul'
        break
      }
      case 'hangul': {
        if (string[index] === '-' && !TransformRoughRomanVowelRegex.test(string[index + 1])) {
          index += 1
        }
        if (!ReadHead() && !skipVowel) {
          rewind()
          break
        } else if (pending.length === 0) {
          pending.push('ᄋ')
        }
        if (!ReadVowel()) {
          rewind()
          break
        }
        if (JamoTable[pending[1]].text.length > 1) {
          const length = JamoTable[pending[1]].text.length
          for (let i = 1; i < length; ++i) {
            // backup(3, length - i)
          }
        }
        parts.push(pending[0])
        parts.push(pending[1])
        if (ReadTail()) {
          const stack = [parts.pop(), parts.pop()].reverse()
          const ref = JamoTable[pending[2]]
          if (ref.split || ref.second) {
            backup(1)
          }
          backup(0)
          parts.push(...stack, pending[2])
        }
        break
      }
      case 'error': {
        return string
      }
    }
  }
  if (N < 0) {
    console.error(string)
    return string
  }
  return parts.join('')
}

const TransformExact = false
function Transform (string) {
  if (IsHangulSyllable(string[0])) {
    return TransformHangulUnique(string)
  }
  return TransformExact ? TransformUniqueRoman(string) : TransformRoughRoman(string)
}

function CompileText (string) {
  const ImportantSectionRegex = /(?:[\uAC00-\uD7A3]+|[abcdefghijklmnoprstuwy]+(?:-?[abcdefghijklmnoprstuwy]+)*(?=\b|\d))/igu
  return string.normalize().replace(ImportantSectionRegex, Transform).normalize()
}

function DoIO () {
  const input = document.querySelector('#input')
  const output = document.querySelector('#output')
  const text = input.value.normalize()
  output.value = CompileText(text)
}

function Test () {
  const list = [...BlockMap.entries()]
  const rng = () => list[Math.floor(Math.random() * list.length)][0]
  const N = 10000
  for (let i = 0; i < N; ++i) {
    const a = rng()
    const b = rng()
    const c = rng()
    const d = rng()
    const e = rng()
    const string = `${a}${b}${c}${d}${e}`
    if (i === 0) {
      console.log(string)
    }
    if (string !== TransformRoughRoman(TransformHangulUnique(string)).normalize()) {
      console.error(string, TransformHangulUnique(string), TransformRoughRoman(TransformHangulUnique(string)))
      throw new Error('mismatch')
    }
  }
}

function Setup () {
  const input = document.querySelector('#input')
  const events = [
    'change',
    'input'
  ]
  events.forEach(el => input.addEventListener(el, DoIO))
  const strings = []
  for (let i = 0xAC00; i <= 0xD7A3; ++i) {
    strings.push(String.fromCodePoint(i))
  }
  const blockMap = new Map()
  const offerBlock = array => {
    const chs = array.map(el => String.fromCodePoint(el))
    const roman = chs.map(ch => JamoTable[ch].text).join('')
    const block = chs.join('').normalize()
    RomanMap.set(roman, block)
    BlockMap.set(block, roman)
    blockMap.set(block, roman)
  }
  for (const jamo in JamoTable) {
    if (typeof JamoTable[jamo] !== 'object') {
      JamoTable[jamo] = {
        self: jamo,
        text: JamoTable[jamo]
      }
    } else {
      JamoTable[jamo].self = jamo
    }
  }
  for (let a = 0x1100; a <= 0x1112; ++a) {
    const ch = String.fromCodePoint(a)
    JamoTable[ch].leading = true
    InverseLeadJamo[JamoTable[ch].text] = ch
  }
  InverseLeadJamo.r = 'ᄅ'
  for (let b = 0x1161; b <= 0x1175; ++b) {
    const ch = String.fromCodePoint(b)
    JamoTable[ch].vowel = true
    InverseVowelJamo[JamoTable[ch].text] = ch
  }
  for (let c = 0x11A8; c <= 0x11C2; ++c) {
    const ch = String.fromCodePoint(c)
    JamoTable[ch].trailing = true
    InverseTailJamo[JamoTable[ch].text] = ch
    if (JamoTable[ch].text.indexOf('l') >= 0) {
      InverseTailJamo[JamoTable[ch].text.replace('l', 'r')] = ch
    }
  }
  // Hangul Syllable Composition Jamo: First Middle Last
  for (let a = 0x1100; a <= 0x1112; ++a) {
    for (let b = 0x1161; b <= 0x1175; ++b) {
      offerBlock([a, b])
      for (let c = 0x11A8; c <= 0x11C2; ++c) {
        offerBlock([a, b, c])
      }
    }
  }
  const tails = Object.values(JamoTable).filter(el => el.vowel || el.trailing)
  const heads = Object.values(JamoTable).filter(el => el.vowel || el.leading)
  JamoTable['ᄋ'].text = '-'
  const joinMap = new Map()
  tails.forEach(tail => {
    heads.forEach(head => {
      const el = `${tail.text}${head.text === 'ᄋ' ? '' : head.text}`
      const array = (joinMap.get(el) ?? [])
      array.push({
        text: el,
        tail,
        head
      })
      joinMap.set(el, array)
      if (tail.vowel && head.double) {
        const el = head.text
        const array = (joinMap.get(el) ?? [])
        array.push({
          text: el,
          tail,
          head
        })
        joinMap.set(el, array)
      }
    })
  })
  for (const [, v] of joinMap) {
    if (v.length > 1) {
      for (const el of v) {
        const set = ConfusionMap.get(el.tail.self) ?? new Set()
        set.add(el.head.self)
        ConfusionMap.set(el.tail.self, set)
      }
    }
  }
  InverseLeadJamo['-'] = 'ᄋ'
}

Setup()
